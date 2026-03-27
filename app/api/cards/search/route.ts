import { NextRequest, NextResponse } from "next/server";

import { searchCards } from "@/lib/server/cards";
import { badRequest, upstreamError } from "@/lib/server/http";
import type { SearchCardsResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return badRequest("Missing required query parameter: q");
  }

  try {
    const results = await searchCards(query);
    const payload: SearchCardsResponse = {
      query,
      results,
    };
    return NextResponse.json(payload);
  } catch {
    return upstreamError("Failed to search cards.");
  }
}
