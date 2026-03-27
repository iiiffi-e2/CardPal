"use client";

import type { CardDetail, EvaluateInput, EvaluateResponse, SearchCardsResponse } from "@/lib/types";

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error || "Request failed."
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchSearchCards(query: string): Promise<SearchCardsResponse> {
  const response = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonOrThrow<SearchCardsResponse>(response);
}

export async function fetchCardDetail(cardId: string): Promise<CardDetail> {
  const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonOrThrow<CardDetail>(response);
}

export async function postEvaluateCard(input: EvaluateInput): Promise<EvaluateResponse> {
  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseJsonOrThrow<EvaluateResponse>(response);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
