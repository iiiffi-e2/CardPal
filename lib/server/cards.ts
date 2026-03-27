import "server-only";

import { CardDetail, PricePoint, SearchCard } from "@/lib/types";
import { pokemonApiGet } from "@/lib/server/pokemonApi";

type PokemonApiListResponse<T> = {
  data: T[];
};

type PokemonApiItemResponse<T> = {
  data: T;
};

type PokemonApiCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set?: {
    name?: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: Record<string, PokemonApiPricePoint | undefined>;
  };
};

type PokemonApiPricePoint = {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
  directLow?: number | null;
};

function asNumber(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return value;
}

function normalizePricePoint(value: PokemonApiPricePoint | undefined): PricePoint {
  return {
    low: asNumber(value?.low),
    mid: asNumber(value?.mid),
    high: asNumber(value?.high),
    market: asNumber(value?.market),
    directLow: asNumber(value?.directLow),
  };
}

function normalizeSearchCard(card: PokemonApiCard): SearchCard {
  return {
    id: card.id,
    name: card.name,
    number: card.number ?? "",
    setName: card.set?.name ?? "Unknown Set",
    rarity: card.rarity ?? "Unknown",
    imageSmall: card.images?.small ?? "",
  };
}

function normalizeDetailCard(card: PokemonApiCard): CardDetail {
  const prices: Record<string, PricePoint> = {};
  for (const [variantName, variantValue] of Object.entries(card.tcgplayer?.prices ?? {})) {
    prices[variantName] = normalizePricePoint(variantValue);
  }

  return {
    id: card.id,
    name: card.name,
    number: card.number ?? "",
    setName: card.set?.name ?? "Unknown Set",
    rarity: card.rarity ?? "Unknown",
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
    tcgplayer: {
      updatedAt: card.tcgplayer?.updatedAt ?? "",
      url: card.tcgplayer?.url ?? "",
      prices,
    },
  };
}

function buildSearchExpression(query: string): string {
  const sanitized = query
    .trim()
    .replace(/"/g, "")
    .replace(/:/g, "")
    .replace(/\s+/g, " ");

  const wildcardQuery = `name:*${sanitized}*`;
  return encodeURIComponent(wildcardQuery);
}

export async function searchCards(query: string): Promise<SearchCard[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const expression = buildSearchExpression(trimmed);
  const response = await pokemonApiGet<PokemonApiListResponse<PokemonApiCard>>(
    `/cards?q=${expression}&pageSize=25`,
  );

  return response.data.map(normalizeSearchCard);
}

export async function getCardDetail(cardId: string): Promise<CardDetail> {
  const response = await pokemonApiGet<PokemonApiItemResponse<PokemonApiCard>>(
    `/cards/${encodeURIComponent(cardId)}`,
  );

  return normalizeDetailCard(response.data);
}
