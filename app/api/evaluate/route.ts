import { NextResponse } from "next/server";

import { evaluateCard } from "@/lib/server/evaluation";
import { badRequest, upstreamError } from "@/lib/server/http";
import type { Condition, EvaluateInput, EvaluationMode } from "@/lib/types";

const VALID_CONDITIONS: Condition[] = ["NM", "LP", "MP", "HP", "DMG"];
const VALID_MODES: EvaluationMode[] = ["standard", "kid"];

function isValidCondition(value: unknown): value is Condition {
  return typeof value === "string" && VALID_CONDITIONS.includes(value as Condition);
}

function isValidMode(value: unknown): value is EvaluationMode {
  return typeof value === "string" && VALID_MODES.includes(value as EvaluationMode);
}

function parseInput(body: unknown): { input?: EvaluateInput; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }

  const payload = body as Record<string, unknown>;
  const cardId = payload.cardId;
  const askingPrice = payload.askingPrice;
  const condition = payload.condition;
  const mode = payload.mode;

  if (typeof cardId !== "string" || !cardId.trim()) {
    return { error: "Missing card id." };
  }
  if (typeof askingPrice !== "number" || !Number.isFinite(askingPrice)) {
    return { error: "Please enter a valid asking price." };
  }
  if (askingPrice <= 0) {
    return { error: "Asking price must be greater than $0." };
  }
  if (askingPrice > 100000) {
    return { error: "Asking price looks too high. Please check the number." };
  }
  if (!isValidCondition(condition)) {
    return { error: "Please choose a valid condition." };
  }
  if (!isValidMode(mode)) {
    return { error: "Invalid evaluation mode." };
  }

  return {
    input: {
      cardId: cardId.trim(),
      askingPrice,
      condition,
      mode,
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const parsed = parseInput(body);
  if (!parsed.input) {
    return badRequest(parsed.error ?? "Invalid evaluate payload.");
  }

  try {
    const result = await evaluateCard(parsed.input);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not evaluate this card right now.";

    if (message.toLowerCase().includes("asking price")) {
      return badRequest(message);
    }

    return upstreamError("Could not evaluate this card right now. Please try again.");
  }
}
