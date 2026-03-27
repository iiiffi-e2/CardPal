"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CardShell, PageShell, PrimaryButton } from "@/components/ui";
import { formatCurrency } from "@/lib/client/api";
import { clearLastEvaluation, getLastEvaluation } from "@/lib/client/storage";
import type { EvaluateResponse, EvaluationResult } from "@/lib/types";

function badgeStyles(result: EvaluationResult): { badge: string; button: "buy" | "negotiate" | "walk" } {
  if (result === "BUY") {
    return {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      button: "buy",
    };
  }
  if (result === "NEGOTIATE") {
    return {
      badge: "bg-amber-100 text-amber-900 border-amber-300",
      button: "negotiate",
    };
  }
  return {
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    button: "walk",
  };
}

export function ResultScreen() {
  const params = useParams<{ id: string }>();
  const cardId = params.id;
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const raw = getLastEvaluation();
    if (!raw) {
      setError("No recent recommendation found. Please run an evaluation first.");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as EvaluateResponse;
      if (parsed.card.id !== cardId) {
        setError("Recommendation mismatch. Please evaluate this card again.");
        return;
      }
      setResult(parsed);
    } catch {
      setError("Could not read recommendation data.");
    }
  }, [cardId]);

  const styles = useMemo(
    () => (result ? badgeStyles(result.result) : { badge: "", button: "ghost" as const }),
    [result],
  );

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
    <PageShell title="Recommendation" subtitle="CardPal decision summary and talking scripts.">
      <CardShell>
        <Link href={cardId ? `/card/${encodeURIComponent(cardId)}` : "/"} className="text-sm font-medium text-blue-700">
          ← Back to card
        </Link>
      </CardShell>

      {error ? (
        <CardShell className="space-y-3 border-rose-200">
          <p className="text-sm text-rose-700">{error}</p>
          <Link href={cardId ? `/card/${encodeURIComponent(cardId)}` : "/"}>
            <PrimaryButton variant="ghost">Return to card</PrimaryButton>
          </Link>
        </CardShell>
      ) : null}

      {result ? (
        <>
          <CardShell className="space-y-3">
            <div className="flex items-center gap-3">
              {result.card.imageSmall ? (
                <Image
                  src={result.card.imageSmall}
                  alt={result.card.name}
                  width={68}
                  height={94}
                  className="h-[94px] w-[68px] rounded-md object-cover"
                />
              ) : (
                <div className="h-[94px] w-[68px] rounded-md bg-slate-200" />
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">{result.card.name}</p>
                <p className="text-sm text-slate-600">
                  {result.card.setName} • #{result.card.number}
                </p>
              </div>
            </div>

            <div className={`rounded-2xl border px-4 py-5 text-center ${styles.badge}`}>
              <p className="text-xs font-semibold tracking-[0.18em]">DECISION</p>
              <p className="mt-1 text-4xl font-extrabold">{result.result}</p>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{result.explanation}</p>
          </CardShell>

          <CardShell className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Price breakdown</p>
            <dl className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <dt>Selected variant</dt>
                <dd className="font-semibold">{result.selectedVariant.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Reference ({result.selectedVariant.referenceSource})</dt>
                <dd className="font-semibold">{formatCurrency(result.selectedVariant.referencePrice)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Adjusted ({result.condition})</dt>
                <dd className="font-semibold">{formatCurrency(result.selectedVariant.adjustedPrice)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Asking price</dt>
                <dd className="font-semibold">{formatCurrency(result.askingPrice)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Difference</dt>
                <dd className={`font-bold ${result.difference.amount <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {result.difference.amount > 0 ? "+" : ""}
                  {formatCurrency(result.difference.amount)} ({result.difference.percent > 0 ? "+" : ""}
                  {result.difference.percent}%)
                </dd>
              </div>
            </dl>
          </CardShell>

          <CardShell className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              Suggested scripts ({result.mode === "kid" ? "Kid mode" : "Standard"})
            </p>
            <ul className="space-y-2">
              {result.scripts.map((script, index) => (
                <li key={`${script}-${index}`} className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <p className="text-sm text-slate-800">{script}</p>
                  <PrimaryButton
                    variant="ghost"
                    className="py-2 text-sm"
                    onClick={() => void copyScript(script, index)}
                  >
                    {copiedIndex === index ? "Copied!" : "Copy script"}
                  </PrimaryButton>
                </li>
              ))}
            </ul>
          </CardShell>

          <PrimaryButton
            variant={styles.button}
            onClick={() => {
              clearLastEvaluation();
              window.location.href = "/";
            }}
          >
            Start New Search
          </PrimaryButton>
        </>
      ) : null}
    </PageShell>
  );
}
