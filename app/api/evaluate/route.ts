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

function parseInput(body: unknown): EvaluateInput | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const payload = body as Record<string, unknown>;
  const cardId = payload.cardId;
  const askingPrice = payload.askingPrice;
  const condition = payload.condition;
  const mode = payload.mode;

  if (
    typeof cardId !== "string" ||
    !cardId.trim() ||
    typeof askingPrice !== "number" ||
    !Number.isFinite(askingPrice) ||
    askingPrice <= 0 ||
    !isValidCondition(condition) ||
    !isValidMode(mode)
  ) {
    return undefined;
  }

  return {
    cardId: cardId.trim(),
    askingPrice,
    condition,
    mode,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const input = parseInput(body);
  if (!input) {
    return badRequest("Invalid evaluate payload.");
  }

  try {
    const result = await evaluateCard(input);
    return NextResponse.json(result);
  } catch {
    return upstreamError("Failed to evaluate card.");
  }
}
