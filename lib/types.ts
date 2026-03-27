export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";
export type EvaluationMode = "standard" | "kid";
export type EvaluationResult = "BUY" | "NEGOTIATE" | "WALK";

export type SearchCard = {
  id: string;
  name: string;
  number: string;
  setName: string;
  rarity: string;
  imageSmall: string;
};

export type SearchCardsResponse = {
  query: string;
  results: SearchCard[];
};

export type PricePoint = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
};

export type CardDetail = {
  id: string;
  name: string;
  number: string;
  setName: string;
  rarity: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer: {
    updatedAt: string;
    url: string;
    prices: Record<string, PricePoint>;
  };
};

export type EvaluateInput = {
  cardId: string;
  askingPrice: number;
  condition: Condition;
  mode: EvaluationMode;
};

export type EvaluateResponse = {
  card: Pick<SearchCard, "id" | "name" | "number" | "setName" | "imageSmall">;
  result: EvaluationResult;
  explanation: string;
  scripts: string[];
  selectedVariant: {
    name: string;
    referenceSource: "market" | "mid" | "avgLowMid";
    referencePrice: number;
    adjustedPrice: number;
  };
  difference: {
    amount: number;
    percent: number;
  };
  askingPrice: number;
  condition: Condition;
  mode: EvaluationMode;
};
