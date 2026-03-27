import { NextResponse } from "next/server";

import { getCardDetail } from "@/lib/server/cards";
import { badRequest, upstreamError } from "@/lib/server/http";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return badRequest("Missing required card id.");
  }

  try {
    const card = await getCardDetail(id);
    return NextResponse.json(card);
  } catch {
    return upstreamError("Failed to fetch card detail.");
  }
}
