"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  CardShell,
  PageShell,
  PriceBreakdown,
  PrimaryButton,
  ResultBadge,
  ScriptCard,
  classes,
} from "@/components/ui";
import { formatCurrency } from "@/lib/client/api";
import { clearLastEvaluation, getKidMode, getLastEvaluation } from "@/lib/client/storage";
import type { EvaluateResponse, EvaluationResult } from "@/lib/types";

function actionVariant(result: EvaluationResult): "buy" | "negotiate" | "walk" {
  if (result === "BUY") {
    return "buy";
  }
  if (result === "NEGOTIATE") {
    return "negotiate";
  }
  return "walk";
}

export function ResultScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cardId = params.id;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [kidMode] = useState(() => getKidMode());
  const evaluationState = useMemo(() => {
    const raw = getLastEvaluation();
    if (!raw) {
      return {
        result: null,
        error: "No recent recommendation found. Please run an evaluation first.",
      };
    }
    try {
      const parsed = JSON.parse(raw) as EvaluateResponse;
      if (parsed.card.id !== cardId) {
        return {
          result: null,
          error: "Recommendation mismatch. Please evaluate this card again.",
        };
      }
      return { result: parsed, error: null };
    } catch {
      return { result: null, error: "Could not read recommendation data." };
    }
  }, [cardId]);
  const { result, error } = evaluationState;

  const buttonVariant = useMemo(() => (result ? actionVariant(result.result) : "surface"), [result]);
  const explanationText = useMemo(() => {
    if (!result) {
      return "";
    }
    if (!kidMode) {
      return result.explanation;
    }

    if (result.result === "BUY") {
      return "Great find. This price is lower than expected.";
    }
    if (result.result === "NEGOTIATE") {
      return "Close price. Ask if they can go a bit lower.";
    }
    return "This one costs too much right now. Keep looking.";
  }, [kidMode, result]);

  const copyScript = async (script: string, index: number) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedIndex(index);
      window.setTimeout(() => {
        setCopiedIndex((current) => (current === index ? null : current));
      }, 1400);
    } catch {
      setCopiedIndex(null);
    }
  };

  return (
    <PageShell title="Recommendation" subtitle="Fast decision for this deal.">
      <CardShell>
        <Link
          href={cardId ? `/card/${encodeURIComponent(cardId)}` : "/"}
          className="text-base font-semibold text-text-secondary"
        >
          Back
        </Link>
      </CardShell>

      {error ? (
        <CardShell className="space-y-3">
          <p className="text-base text-walk">{error}</p>
          <Link href={cardId ? `/card/${encodeURIComponent(cardId)}` : "/"}>
            <PrimaryButton variant="surface">Return to card</PrimaryButton>
          </Link>
        </CardShell>
      ) : null}

      {result ? (
        <>
          <CardShell className="space-y-5">
            <div className="flex items-center gap-4">
              {result.card.imageSmall ? (
                <Image
                  src={result.card.imageSmall}
                  alt={result.card.name}
                  width={78}
                  height={108}
                  className="h-[108px] w-[78px] rounded-lg object-cover"
                />
              ) : (
                <div className="h-[108px] w-[78px] rounded-lg bg-slate-700" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold tracking-tight text-text-primary">{result.card.name}</p>
                <p className="text-sm text-text-secondary">
                  {result.card.setName} #{result.card.number}
                </p>
              </div>
            </div>

            <ResultBadge result={result.result} kidMode={kidMode} />

            <p className="text-lg leading-relaxed font-semibold text-text-primary">{explanationText}</p>
          </CardShell>

          <PriceBreakdown
            askingPrice={result.askingPrice}
            marketPrice={result.selectedVariant.adjustedPrice}
            differenceAmount={result.difference.amount}
            differencePercent={result.difference.percent}
            kidMode={kidMode}
          />

          <CardShell className="space-y-4">
            <p className="text-xl font-extrabold tracking-tight text-text-primary">
              Scripts
            </p>
            <p className="text-sm text-text-secondary">
              {kidMode ? "Short and friendly lines you can use." : "Use one of these lines at the table."}
            </p>
            <ul className="space-y-3">
              {result.scripts.map((script, index) => (
                <ScriptCard
                  key={`${script}-${index}`}
                  script={script}
                  copied={copiedIndex === index}
                  onCopy={() => void copyScript(script, index)}
                />
              ))}
            </ul>
          </CardShell>

          <div className="space-y-3">
            <Link
              href={`/card/${encodeURIComponent(cardId)}?asking=${encodeURIComponent(String(result.askingPrice))}&condition=${encodeURIComponent(result.condition)}`}
            >
              <PrimaryButton variant={buttonVariant}>Try another price</PrimaryButton>
            </Link>
            <PrimaryButton
              variant="surface"
              onClick={() => {
                clearLastEvaluation();
                router.push("/");
              }}
            >
              Search another card
            </PrimaryButton>
          </div>

          {!kidMode ? (
            <CardShell className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Pricing source</p>
              <p className={classes("text-sm text-text-secondary")}>
                {result.selectedVariant.name} · {result.selectedVariant.referenceSource} ·{" "}
                {formatCurrency(result.selectedVariant.referencePrice)}
              </p>
            </CardShell>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
