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
  referenceSource: "market" | "mid" | "avgLowMid";
};

const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  NM: 1,
  LP: 0.9,
  MP: 0.75,
  HP: 0.55,
  DMG: 0.35,
};

const PREFERRED_VARIANTS = ["holofoil", "reverseHolofoil", "normal"];

function pickReferencePrice(pricePoint: PricePoint):
  | {
      source: "market" | "mid" | "avgLowMid";
      value: number;
    }
  | undefined {
  if (typeof pricePoint.market === "number") {
    return { source: "market", value: pricePoint.market };
  }

  if (typeof pricePoint.mid === "number") {
    return { source: "mid", value: pricePoint.mid };
  }

  if (typeof pricePoint.low === "number" && typeof pricePoint.mid === "number") {
    return {
      source: "avgLowMid",
      value: (pricePoint.low + pricePoint.mid) / 2,
    };
  }

  if (typeof pricePoint.low === "number") {
    return {
      source: "avgLowMid",
      value: pricePoint.low,
    };
  }

  return undefined;
}

function selectVariant(prices: Record<string, PricePoint>): VariantSelection | undefined {
  const preferred = PREFERRED_VARIANTS
    .filter((variant) => prices[variant])
    .map((variant) => [variant, prices[variant]] as const);
  const others = Object.entries(prices).filter(
    ([variant]) => !PREFERRED_VARIANTS.includes(variant),
  );

  for (const [variantName, pricePoint] of [...preferred, ...others]) {
    const reference = pickReferencePrice(pricePoint);
    if (!reference) {
      continue;
    }
    return {
      variantName,
      referencePrice: reference.value,
      referenceSource: reference.source,
    };
  }

  return undefined;
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
    },
  } as const;

  return byMode[mode][result];
}

function buildExplanation(params: {
  result: EvaluationResult;
  adjustedPrice: number;
  differenceAmount: number;
  condition: Condition;
  variantName: string;
  usedLowPriceRule: boolean;
}): string {
  const diffLabel =
    params.differenceAmount > 0
      ? `$${Math.abs(params.differenceAmount).toFixed(2)} above`
      : `$${Math.abs(params.differenceAmount).toFixed(2)} below`;

  const lowRuleMessage = params.usedLowPriceRule
    ? "Because this is a low-dollar card, CardPal used fixed dollar thresholds."
    : "CardPal used ratio-based thresholds for this recommendation.";

  if (params.result === "BUY") {
    return `BUY: the asking price is ${diffLabel} the adjusted ${params.condition} value for ${params.variantName}. ${lowRuleMessage}`;
  }

  if (params.result === "NEGOTIATE") {
    return `NEGOTIATE: the asking price is close to the adjusted ${params.condition} value for ${params.variantName}. ${lowRuleMessage}`;
  }

  return `WALK: the asking price is meaningfully above the adjusted ${params.condition} value for ${params.variantName}. ${lowRuleMessage}`;
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

export async function evaluateCard(input: EvaluateInput): Promise<EvaluateResponse> {
  const card = await getCardDetail(input.cardId);
  const selectedVariant = selectVariant(card.tcgplayer.prices);

  if (!selectedVariant) {
    throw new Error("No usable pricing variant found for this card.");
  }

  const multiplier = CONDITION_MULTIPLIERS[input.condition];
  const adjustedPrice = roundCurrency(selectedVariant.referencePrice * multiplier);
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
    askingPrice,
    condition: input.condition,
    mode: input.mode,
  };
}
