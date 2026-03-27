import "server-only";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";
const POKEMON_TCG_API_KEY_ENV = "POKEMON_TCG_API_KEY";

type MaybeString = string | null;

type RawCard = {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  hp?: string;
  evolvesFrom?: string;
  rarity?: string;
  number?: string;
  artist?: string;
  set?: {
    id?: string;
    name?: string;
    series?: string;
    releaseDate?: string;
    images?: {
      symbol?: string;
      logo?: string;
    };
  };
  images?: {
    small?: string;
    large?: string;
  };
};

type RawSearchResponse = {
  data?: RawCard[];
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
  error?: string;
  message?: string;
};

type RawCardByIdResponse = {
  data?: RawCard;
  error?: string;
  message?: string;
};

export type PokemonTcgCard = {
  id: string;
  name: string;
  supertype: MaybeString;
  subtypes: string[];
  types: string[];
  hp: MaybeString;
  evolvesFrom: MaybeString;
  rarity: MaybeString;
  number: MaybeString;
  artist: MaybeString;
  set: {
    id: MaybeString;
    name: MaybeString;
    series: MaybeString;
    releaseDate: MaybeString;
    images: {
      symbol: MaybeString;
      logo: MaybeString;
    };
  };
  images: {
    small: MaybeString;
    large: MaybeString;
  };
};

export type SearchCardsResult = {
  cards: PokemonTcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

export class PokemonTcgApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "PokemonTcgApiError";
    this.statusCode = statusCode;
  }
}

function toNullableString(value: unknown): MaybeString {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function normalizeCard(card: RawCard): PokemonTcgCard {
  return {
    id: card.id,
    name: card.name,
    supertype: toNullableString(card.supertype),
    subtypes: toStringArray(card.subtypes),
    types: toStringArray(card.types),
    hp: toNullableString(card.hp),
    evolvesFrom: toNullableString(card.evolvesFrom),
    rarity: toNullableString(card.rarity),
    number: toNullableString(card.number),
    artist: toNullableString(card.artist),
    set: {
      id: toNullableString(card.set?.id),
      name: toNullableString(card.set?.name),
      series: toNullableString(card.set?.series),
      releaseDate: toNullableString(card.set?.releaseDate),
      images: {
        symbol: toNullableString(card.set?.images?.symbol),
        logo: toNullableString(card.set?.images?.logo),
      },
    },
    images: {
      small: toNullableString(card.images?.small),
      large: toNullableString(card.images?.large),
    },
  };
}

function getApiKey(): string {
  const key = process.env[POKEMON_TCG_API_KEY_ENV];
  if (!key) {
    throw new PokemonTcgApiError(
      `Missing ${POKEMON_TCG_API_KEY_ENV} environment variable for Pokemon TCG API access.`,
      500,
    );
  }

  return key;
}

function buildApiUrl(path: string): string {
  return `${POKEMON_TCG_API_BASE_URL}${path}`;
}

async function requestPokemonTcgApi<T>(path: string): Promise<T> {
  // Defense-in-depth: this module is server-only and should never be called from the browser.
  if (typeof window !== "undefined") {
    throw new PokemonTcgApiError("Pokemon TCG API wrapper can only run on the server.", 500);
  }

  const apiKey = getApiKey();
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
      cache: "no-store",
    });
  } catch {
    throw new PokemonTcgApiError("Unable to reach the Pokemon TCG API.", 502);
  }

  let body: { error?: string; message?: string } | null = null;
  try {
    body = (await response.json()) as { error?: string; message?: string };
  } catch {
    body = null;
  }

  if (!response.ok) {
    const apiMessage = typeof body?.error === "string" ? body.error : body?.message;

    if (response.status === 404) {
      throw new PokemonTcgApiError(apiMessage ?? "Pokemon card not found.", 404);
    }

    throw new PokemonTcgApiError(apiMessage ?? "Pokemon TCG API request failed.", response.status);
  }

  if (!body) {
    throw new PokemonTcgApiError("Pokemon TCG API returned an empty response.", 502);
  }

  return body as T;
}

export async function searchCards(query: string): Promise<SearchCardsResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new PokemonTcgApiError("Query is required to search cards.", 400);
  }

  const params = new URLSearchParams({ q: trimmedQuery });
  const response = await requestPokemonTcgApi<RawSearchResponse>(`/cards?${params.toString()}`);
  const cards = (response.data ?? []).map(normalizeCard);

  return {
    cards,
    page: response.page ?? 1,
    pageSize: response.pageSize ?? cards.length,
    count: response.count ?? cards.length,
    totalCount: response.totalCount ?? cards.length,
  };
}

export async function getCardById(id: string): Promise<PokemonTcgCard | null> {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new PokemonTcgApiError("Card id is required.", 400);
  }

  try {
    const response = await requestPokemonTcgApi<RawCardByIdResponse>(`/cards/${encodeURIComponent(trimmedId)}`);
    if (!response.data) {
      throw new PokemonTcgApiError("Pokemon TCG API returned no card data.", 502);
    }

    return normalizeCard(response.data);
  } catch (error) {
    if (error instanceof PokemonTcgApiError && error.statusCode === 404) {
      return null;
    }

    throw error;
  }
}
