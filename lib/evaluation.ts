export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";
export type EvaluationDecision = "BUY" | "NEGOTIATE" | "WALK";
export type ReferenceSource = "market" | "mid" | "avgLowMid" | "lowFallback";

export type PricePoint = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
};

export type NormalizedCard = {
  id: string;
  name: string;
  number?: string;
  setName?: string;
  prices: Record<string, PricePoint>;
  preferredVariants?: string[];
};

export type EvaluationInput = {
  askingPrice: number;
  condition: Condition;
  preferredVariants?: string[];
};

export type ReferencePrice = {
  source: ReferenceSource;
  value: number;
};

export type SelectedVariant = {
  name: string;
  referenceSource: ReferenceSource;
  referencePrice: number;
};

export type EvaluationOutput = {
  card: {
    id: string;
    name: string;
    number?: string;
    setName?: string;
  };
  decision: EvaluationDecision;
  explanation: string;
  askingPrice: number;
  condition: Condition;
  conditionMultiplier: number;
  selectedVariant: {
    name: string;
    referenceSource: ReferenceSource;
    referencePrice: number;
    adjustedPrice: number;
  };
  difference: {
    amount: number;
    percent: number;
  };
  lowPriceFallbackApplied: boolean;
};

const DEFAULT_PREFERRED_VARIANTS = ["holofoil", "reverseHolofoil", "normal"];
const LOW_PRICE_REFERENCE_CUTOFF = 5;
const LOW_PRICE_BUY_DELTA = -0.5;
const LOW_PRICE_NEGOTIATE_DELTA = 0.5;
const BUY_RATIO_CUTOFF = 0.9;
const NEGOTIATE_RATIO_CUTOFF = 1.1;

const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  NM: 1,
  LP: 0.9,
  MP: 0.75,
  HP: 0.55,
  DMG: 0.35,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function asValidPrice(value: unknown): number | undefined {
  if (!isFiniteNumber(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function pickReferencePrice(pricePoint: PricePoint): ReferencePrice | undefined {
  const market = asValidPrice(pricePoint.market);
  if (market) {
    return { source: "market", value: market };
  }

  const mid = asValidPrice(pricePoint.mid);
  const low = asValidPrice(pricePoint.low);
  if (mid && low) {
    return { source: "avgLowMid", value: (low + mid) / 2 };
  }
  if (mid) {
    return { source: "mid", value: mid };
  }

  const directLow = asValidPrice(pricePoint.directLow);
  if (low) {
    return { source: "lowFallback", value: low };
  }
  if (directLow) {
    return { source: "lowFallback", value: directLow };
  }

  return undefined;
}

function uniquePreferredVariants(variants: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const variant of variants) {
    const normalized = variant.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

export function selectVariant(
  prices: Record<string, PricePoint>,
  preferredVariants: string[] = DEFAULT_PREFERRED_VARIANTS,
): SelectedVariant | undefined {
  const variantEntries = Object.entries(prices);
  if (variantEntries.length === 0) {
    return undefined;
  }

  const byNormalizedName = new Map<string, [string, PricePoint]>();
  for (const [name, point] of variantEntries) {
    byNormalizedName.set(name.toLowerCase(), [name, point]);
  }

  const preferredOrder = uniquePreferredVariants(preferredVariants);
  const preferredEntries: Array<[string, PricePoint]> = [];
  for (const preferred of preferredOrder) {
    const entry = byNormalizedName.get(preferred);
    if (entry) {
      preferredEntries.push(entry);
    }
  }

  const preferredSet = new Set(preferredEntries.map(([name]) => name));
  const remainingEntries = variantEntries
    .filter(([name]) => !preferredSet.has(name))
    .sort(([left], [right]) => left.localeCompare(right));

  for (const [variantName, point] of [...preferredEntries, ...remainingEntries]) {
    const reference = pickReferencePrice(point);
    if (!reference) {
      continue;
    }

    return {
      name: variantName,
      referenceSource: reference.source,
      referencePrice: reference.value,
    };
  }

  return undefined;
}

export function getConditionMultiplier(condition: Condition): number {
  return CONDITION_MULTIPLIERS[condition];
}

export function decideEvaluation(params: {
  askingPrice: number;
  adjustedReferencePrice: number;
}): { decision: EvaluationDecision; lowPriceFallbackApplied: boolean } {
  const { askingPrice, adjustedReferencePrice } = params;

  if (adjustedReferencePrice < LOW_PRICE_REFERENCE_CUTOFF) {
    const difference = askingPrice - adjustedReferencePrice;

    if (difference <= LOW_PRICE_BUY_DELTA) {
      return { decision: "BUY", lowPriceFallbackApplied: true };
    }
    if (difference <= LOW_PRICE_NEGOTIATE_DELTA) {
      return { decision: "NEGOTIATE", lowPriceFallbackApplied: true };
    }
    return { decision: "WALK", lowPriceFallbackApplied: true };
  }

  const ratio = askingPrice / adjustedReferencePrice;
  if (ratio <= BUY_RATIO_CUTOFF) {
    return { decision: "BUY", lowPriceFallbackApplied: false };
  }
  if (ratio <= NEGOTIATE_RATIO_CUTOFF) {
    return { decision: "NEGOTIATE", lowPriceFallbackApplied: false };
  }
  return { decision: "WALK", lowPriceFallbackApplied: false };
}

function buildExplanation(params: {
  decision: EvaluationDecision;
  condition: Condition;
  variantName: string;
  differenceAmount: number;
  lowPriceFallbackApplied: boolean;
}): string {
  const direction = params.differenceAmount > 0 ? "above" : "below";
  const difference = `$${Math.abs(params.differenceAmount).toFixed(2)} ${direction}`;
  const thresholdMode = params.lowPriceFallbackApplied
    ? "using low-price dollar thresholds"
    : "using ratio thresholds";

  return `${params.decision}: asking price is ${difference} adjusted ${params.condition} value for ${params.variantName} (${thresholdMode}).`;
}

export function evaluateCard(
  input: EvaluationInput,
  normalizedCard: NormalizedCard,
): EvaluationOutput {
  if (!isFiniteNumber(input.askingPrice) || input.askingPrice <= 0) {
    throw new Error("Asking price must be a positive number.");
  }

  const conditionMultiplier = getConditionMultiplier(input.condition);
  if (!isFiniteNumber(conditionMultiplier)) {
    throw new Error(`Unsupported condition: ${input.condition}`);
  }

  const preferredVariants = input.preferredVariants ?? normalizedCard.preferredVariants;
  const selectedVariant = selectVariant(normalizedCard.prices, preferredVariants);
  if (!selectedVariant) {
    throw new Error("No usable card variant found for evaluation.");
  }

  const askingPrice = roundCurrency(input.askingPrice);
  const referencePrice = roundCurrency(selectedVariant.referencePrice);
  const adjustedPrice = roundCurrency(referencePrice * conditionMultiplier);
  if (adjustedPrice <= 0) {
    throw new Error("Adjusted reference price must be greater than zero.");
  }

  const differenceAmount = roundCurrency(askingPrice - adjustedPrice);
  const differencePercent = roundCurrency((differenceAmount / adjustedPrice) * 100);
  const decision = decideEvaluation({
    askingPrice,
    adjustedReferencePrice: adjustedPrice,
  });

  return {
    card: {
      id: normalizedCard.id,
      name: normalizedCard.name,
      number: normalizedCard.number,
      setName: normalizedCard.setName,
    },
    decision: decision.decision,
    explanation: buildExplanation({
      decision: decision.decision,
      condition: input.condition,
      variantName: selectedVariant.name,
      differenceAmount,
      lowPriceFallbackApplied: decision.lowPriceFallbackApplied,
    }),
    askingPrice,
    condition: input.condition,
    conditionMultiplier,
    selectedVariant: {
      name: selectedVariant.name,
      referenceSource: selectedVariant.referenceSource,
      referencePrice,
      adjustedPrice,
    },
    difference: {
      amount: differenceAmount,
      percent: differencePercent,
    },
    lowPriceFallbackApplied: decision.lowPriceFallbackApplied,
  };
}
