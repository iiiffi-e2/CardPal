import "server-only";

const BASE_URL = "https://api.pokemontcg.io/v2";

export class PokemonApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PokemonApiError";
  }
}

function getApiKey(): string | undefined {
  return process.env.POKEMON_TCG_API_KEY ?? process.env.POKEMON_API_KEY;
}

export async function pokemonApiGet<T>(path: string): Promise<T> {
  const headers = new Headers({
    Accept: "application/json",
  });

  const apiKey = getApiKey();
  if (apiKey) {
    headers.set("X-Api-Key", apiKey);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PokemonApiError(
      `Pokemon API request failed with status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}
