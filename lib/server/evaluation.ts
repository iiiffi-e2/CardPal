import "server-only";

import type {
  Condition,
  EvaluationMode,
  EvaluationResult,
  EvaluateResponse,
  EvaluateInput,
  PricePoint,
} from "@/lib/types";
import { getCardDetail } from "@/lib/server/cards";

type VariantSelection = {
  variantName: string;
  referencePrice: number;
  referenceSource: "market" | "mid" | "avgLowMid" | "lowFallback";
};

const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  NM: 1,
  LP: 0.9,
  MP: 0.75,
  HP: 0.55,
  DMG: 0.35,
};

const PREFERRED_VARIANTS = ["holofoil", "reverseHolofoil", "normal"];

function referenceSourceRank(source: VariantSelection["referenceSource"]): number {
  if (source === "market") {
    return 4;
  }
  if (source === "mid") {
    return 3;
  }
  if (source === "avgLowMid") {
    return 2;
  }
  return 1;
}

function pickReferencePrice(pricePoint: PricePoint):
  | {
      source: "market" | "mid" | "avgLowMid" | "lowFallback";
      value: number;
    }
  | undefined {
  if (typeof pricePoint.market === "number") {
    return { source: "market", value: pricePoint.market };
  }

  if (typeof pricePoint.mid === "number") {
    return { source: "mid", value: pricePoint.mid };
  }

  if (
    typeof pricePoint.low === "number" &&
    Number.isFinite(pricePoint.low) &&
    pricePoint.low > 0 &&
    typeof pricePoint.mid === "number" &&
    Number.isFinite(pricePoint.mid) &&
    pricePoint.mid > 0
  ) {
    return {
      source: "avgLowMid",
      value: (pricePoint.low + pricePoint.mid) / 2,
    };
  }

  if (typeof pricePoint.low === "number" && Number.isFinite(pricePoint.low) && pricePoint.low > 0) {
    return {
      source: "lowFallback",
      value: pricePoint.low,
    };
  }

  if (
    typeof pricePoint.directLow === "number" &&
    Number.isFinite(pricePoint.directLow) &&
    pricePoint.directLow > 0
  ) {
    return {
      source: "lowFallback",
      value: pricePoint.directLow,
    };
  }

  return undefined;
}

function selectVariant(prices: Record<string, PricePoint>): VariantSelection | undefined {
  const preferredOrder = new Map(
    PREFERRED_VARIANTS.map((variant, index) => [variant, index] as const),
  );
  const candidates: Array<
    VariantSelection & { sourceRank: number; preferredRank: number }
  > = [];

  for (const [variantName, pricePoint] of Object.entries(prices)) {
    const reference = pickReferencePrice(pricePoint);
    if (!reference) {
      continue;
    }

    const normalizedVariant = variantName.toLowerCase();
    candidates.push({
      variantName,
      referencePrice: reference.value,
      referenceSource: reference.source,
      sourceRank: referenceSourceRank(reference.source),
      preferredRank: preferredOrder.get(normalizedVariant) ?? Number.MAX_SAFE_INTEGER,
    });
  }

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((left, right) => {
    if (left.sourceRank !== right.sourceRank) {
      return right.sourceRank - left.sourceRank;
    }
    if (left.preferredRank !== right.preferredRank) {
      return left.preferredRank - right.preferredRank;
    }
    return left.variantName.localeCompare(right.variantName);
  });

  const [best] = candidates;
  return {
    variantName: best.variantName,
    referencePrice: best.referencePrice,
    referenceSource: best.referenceSource,
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function scriptsForResult(result: EvaluationResult, mode: EvaluationMode): string[] {
  const byMode = {
    standard: {
      BUY: [
        "This is a strong deal at this condition. I can do your asking price.",
        "I am good to buy now if the condition checks out as listed.",
      ],
      NEGOTIATE: [
        "Would you take a little less based on recent market value?",
        "I can do this right now at a fair middle point if that works for you.",
      ],
      WALK: [
        "Thanks for showing it to me. I am going to pass at this price.",
        "I appreciate it, but I need to stay closer to market on this one.",
      ],
      INSUFFICIENT_DATA: [
        "I like the card, but I do not have enough recent pricing data to be confident.",
        "Can we review more comps or details before deciding on a price?",
      ],
    },
    kid: {
      BUY: [
        "This is awesome and a fair price. Can we buy it?",
        "I really like this card and the price seems good.",
      ],
      NEGOTIATE: [
        "Could we maybe do a little lower price?",
        "I want this card. Is there any deal you can make?",
      ],
      WALK: [
        "Thank you! I will keep looking for another one.",
        "It is a cool card, but I need to pass for now.",
      ],
      INSUFFICIENT_DATA: [
        "I like this card, but we need a little more price info first.",
        "Can we check another comp before we decide?",
      ],
    },
  } as const;

  return [...byMode[mode][result]];
}

function buildExplanation(params: {
  result: EvaluationResult;
  adjustedPrice: number;
  differenceAmount: number;
  condition: Condition;
  variantName: string;
  referenceSource: "market" | "mid" | "avgLowMid" | "lowFallback";
  usedLowPriceRule: boolean;
  insufficientDataReason?: string;
}): string {
  if (params.result === "INSUFFICIENT_DATA") {
    return params.insufficientDataReason
      ? `There is not enough reliable pricing data yet: ${params.insufficientDataReason}. Try another listing, comp, or ask for condition details before deciding.`
      : "There is not enough reliable pricing data yet to make a confident recommendation.";
  }

  const diffLabel =
    params.differenceAmount > 0
      ? `$${Math.abs(params.differenceAmount).toFixed(2)} above`
      : `$${Math.abs(params.differenceAmount).toFixed(2)} below`;

  const sourceLabel =
    params.referenceSource === "market"
      ? "based on market data"
      : "based on recent reference pricing";

  const lowRuleMessage = params.usedLowPriceRule
    ? "For low-dollar cards, CardPal uses fixed dollar guide thresholds."
    : "CardPal uses ratio guide thresholds for this estimate.";

  const cautionMessage = "Live show prices and condition can vary in person.";

  if (params.result === "BUY") {
    return `This price looks favorable ${sourceLabel}: it is ${diffLabel} the adjusted ${params.condition} reference for ${params.variantName}. ${lowRuleMessage} ${cautionMessage}`;
  }

  if (params.result === "NEGOTIATE") {
    return `This price looks fair ${sourceLabel}: it is close to the adjusted ${params.condition} reference for ${params.variantName}. ${lowRuleMessage} ${cautionMessage}`;
  }

  return `This price appears high ${sourceLabel}: it is ${diffLabel} the adjusted ${params.condition} reference for ${params.variantName}. ${lowRuleMessage} ${cautionMessage}`;
}

function decideResult(params: {
  askingPrice: number;
  adjustedPrice: number;
}): { result: EvaluationResult; usedLowPriceRule: boolean } {
  const { askingPrice, adjustedPrice } = params;

  if (adjustedPrice < 5) {
    const difference = askingPrice - adjustedPrice;
    if (difference <= -0.5) {
      return { result: "BUY", usedLowPriceRule: true };
    }
    if (difference <= 0.5) {
      return { result: "NEGOTIATE", usedLowPriceRule: true };
    }
    return { result: "WALK", usedLowPriceRule: true };
  }

  const ratio = askingPrice / adjustedPrice;
  if (ratio <= 0.9) {
    return { result: "BUY", usedLowPriceRule: false };
  }
  if (ratio <= 1.1) {
    return { result: "NEGOTIATE", usedLowPriceRule: false };
  }
  return { result: "WALK", usedLowPriceRule: false };
}

function insufficientDataResponse(params: {
  input: EvaluateInput;
  card: Awaited<ReturnType<typeof getCardDetail>>;
  reason: string;
}): EvaluateResponse {
  const askingPrice = roundCurrency(params.input.askingPrice);
  return {
    card: {
      id: params.card.id,
      name: params.card.name,
      number: params.card.number,
      setName: params.card.setName,
      imageSmall: params.card.images.small,
    },
    result: "INSUFFICIENT_DATA",
    explanation: buildExplanation({
      result: "INSUFFICIENT_DATA",
      adjustedPrice: 0,
      differenceAmount: 0,
      condition: params.input.condition,
      variantName: "unknown variant",
      referenceSource: "lowFallback",
      usedLowPriceRule: false,
      insufficientDataReason: params.reason,
    }),
    scripts: scriptsForResult("INSUFFICIENT_DATA", params.input.mode),
    selectedVariant: null,
    difference: null,
    insufficientDataReason: params.reason,
    askingPrice,
    condition: params.input.condition,
    mode: params.input.mode,
  };
}

export async function evaluateCard(input: EvaluateInput): Promise<EvaluateResponse> {
  if (!Number.isFinite(input.askingPrice) || input.askingPrice <= 0) {
    throw new Error("Asking price must be greater than $0.");
  }
  if (input.askingPrice > 100000) {
    throw new Error("Asking price looks too high. Please check the number and try again.");
  }

  const card = await getCardDetail(input.cardId);
  if (!card.id || !card.name) {
    return insufficientDataResponse({
      input,
      card,
      reason: "card details are incomplete from the source",
    });
  }

  const priceVariants = Object.values(card.tcgplayer.prices);
  const variantWithAnyPrice = priceVariants.some((point) => {
    const values = [point.market, point.mid, point.low, point.directLow];
    return values.some((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
  });
  if (!variantWithAnyPrice) {
    return insufficientDataResponse({
      input,
      card,
      reason: "no tcgplayer pricing was available for this card",
    });
  }

  const selectedVariant = selectVariant(card.tcgplayer.prices);

  if (!selectedVariant) {
    return insufficientDataResponse({
      input,
      card,
      reason: "pricing variants exist, but none had enough usable data",
    });
  }
  if (selectedVariant.referenceSource === "lowFallback") {
    return insufficientDataResponse({
      input,
      card,
      reason: "only low-confidence fallback pricing was available",
    });
  }

  const multiplier = CONDITION_MULTIPLIERS[input.condition];
  const adjustedPrice = roundCurrency(selectedVariant.referencePrice * multiplier);
  if (!Number.isFinite(adjustedPrice) || adjustedPrice <= 0) {
    return insufficientDataResponse({
      input,
      card,
      reason: "the adjusted reference price could not be calculated",
    });
  }
  const askingPrice = roundCurrency(input.askingPrice);
  const differenceAmount = roundCurrency(askingPrice - adjustedPrice);
  const differencePercent =
    adjustedPrice === 0 ? 0 : roundCurrency((differenceAmount / adjustedPrice) * 100);
  const decision = decideResult({ askingPrice, adjustedPrice });

  return {
    card: {
      id: card.id,
      name: card.name,
      number: card.number,
      setName: card.setName,
      imageSmall: card.images.small,
    },
    result: decision.result,
    explanation: buildExplanation({
      result: decision.result,
      adjustedPrice,
      differenceAmount,
      condition: input.condition,
      variantName: selectedVariant.variantName,
      referenceSource: selectedVariant.referenceSource,
      usedLowPriceRule: decision.usedLowPriceRule,
    }),
    scripts: scriptsForResult(decision.result, input.mode),
    selectedVariant: {
      name: selectedVariant.variantName,
      referenceSource: selectedVariant.referenceSource,
      referencePrice: roundCurrency(selectedVariant.referencePrice),
      adjustedPrice,
    },
    difference: {
      amount: differenceAmount,
      percent: differencePercent,
    },
    insufficientDataReason: undefined,
    askingPrice,
    condition: input.condition,
    mode: input.mode,
  };
}
