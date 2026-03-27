"use client";

import type { EvaluationMode } from "@/lib/types";

const KID_MODE_KEY = "cardpal:kidMode";
const RECENT_SEARCHES_KEY = "cardpal:recentSearches";
const LAST_EVALUATION_KEY = "cardpal:lastEvaluation";
const MAX_RECENT = 8;

function safeParseArray(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function getKidMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(KID_MODE_KEY) === "true";
}

export function setKidMode(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(KID_MODE_KEY, String(enabled));
}

export function getEvaluationMode(): EvaluationMode {
  return getKidMode() ? "kid" : "standard";
}

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  return safeParseArray(window.localStorage.getItem(RECENT_SEARCHES_KEY));
}

export function addRecentSearch(query: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return getRecentSearches();
  }

  const existing = getRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function setLastEvaluation(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(LAST_EVALUATION_KEY, value);
}

export function getLastEvaluation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(LAST_EVALUATION_KEY);
}

export function clearLastEvaluation(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(LAST_EVALUATION_KEY);
}
