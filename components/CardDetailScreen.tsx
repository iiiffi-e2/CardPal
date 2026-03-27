"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { CardShell, PageShell, PrimaryButton } from "@/components/ui";
import { fetchCardDetail, postEvaluateCard } from "@/lib/client/api";
import { getEvaluationMode, setLastEvaluation } from "@/lib/client/storage";
import type { CardDetail, Condition } from "@/lib/types";

const CONDITIONS: Condition[] = ["NM", "LP", "MP", "HP", "DMG"];

export function CardDetailScreen() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const cardId = params.id;
  const searchQuery = searchParams.get("q")?.trim();

  const [card, setCard] = useState<CardDetail | null>(null);
  const [askingPrice, setAskingPrice] = useState("");
  const [condition, setCondition] = useState<Condition>("LP");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!cardId) {
        setLoading(false);
        setError("Missing card id.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetchCardDetail(cardId);
        if (!active) {
          return;
        }
        setCard(response);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load card detail.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [cardId]);

  const parsedAskingPrice = useMemo(() => Number(askingPrice), [askingPrice]);
  const canSubmit =
    !!card &&
    Number.isFinite(parsedAskingPrice) &&
    parsedAskingPrice > 0 &&
    !submitting &&
    !loading;

  const backHref = searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!card || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const mode = getEvaluationMode();
      const result = await postEvaluateCard({
        cardId: card.id,
        askingPrice: parsedAskingPrice,
        condition,
        mode,
      });
      setLastEvaluation(JSON.stringify(result));
      router.push(`/card/${encodeURIComponent(card.id)}/result`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to evaluate card.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell title="Card Detail" subtitle="Set asking price and card condition.">
      <CardShell>
        <Link href={backHref} className="text-sm font-medium text-blue-700">
          ← Back to results
        </Link>
      </CardShell>

      {loading ? (
        <CardShell>
          <p className="text-sm text-slate-600">Loading card...</p>
        </CardShell>
      ) : null}

      {error ? (
        <CardShell className="space-y-3 border-rose-200">
          <p className="text-sm text-rose-700">{error}</p>
          <PrimaryButton onClick={() => window.location.reload()} variant="ghost">
            Retry
          </PrimaryButton>
        </CardShell>
      ) : null}

      {card ? (
        <>
          <CardShell className="space-y-3">
            <div className="flex items-start gap-3">
              {card.images.small ? (
                <Image
                  src={card.images.small}
                  alt={card.name}
                  width={92}
                  height={128}
                  className="h-[128px] w-[92px] rounded-md object-cover"
                />
              ) : (
                <div className="h-[128px] w-[92px] rounded-md bg-slate-200" />
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">{card.name}</h2>
                <p className="text-sm text-slate-600">
                  {card.setName} • #{card.number}
                </p>
                <p className="text-xs text-slate-500">{card.rarity}</p>
              </div>
            </div>
          </CardShell>

          <CardShell>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="askingPrice" className="text-sm font-semibold text-slate-800">
                  Dealer asking price ($)
                </label>
                <input
                  id="askingPrice"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={askingPrice}
                  onChange={(event) => setAskingPrice(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none ring-blue-500 focus:ring-2"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Condition</p>
                <div className="grid grid-cols-5 gap-2">
                  {CONDITIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCondition(value)}
                      className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${
                        condition === value
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <PrimaryButton type="submit" disabled={!canSubmit}>
                {submitting ? "Evaluating..." : "Get Recommendation"}
              </PrimaryButton>
            </form>
          </CardShell>
        </>
      ) : null}
    </PageShell>
  );
}
