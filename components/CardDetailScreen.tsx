"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CardShell,
  ConditionPillSelector,
  PageShell,
  PrimaryButton,
  classes,
} from "@/components/ui";
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
    <PageShell title="Card detail" subtitle="Set the price and get a fast recommendation.">
      <CardShell>
        <Link href={backHref} className="text-base font-semibold text-text-secondary">
          Back
        </Link>
      </CardShell>

      {loading ? (
        <CardShell className="py-5">
          <p className="text-base text-text-secondary">Loading card...</p>
        </CardShell>
      ) : null}

      {error ? (
        <CardShell className="space-y-3">
          <p className="text-base text-walk">{error}</p>
          <PrimaryButton onClick={() => window.location.reload()} variant="surface">
            Retry
          </PrimaryButton>
        </CardShell>
      ) : null}

      {card ? (
        <>
          <CardShell className="space-y-5 text-center">
            <div className="flex justify-center">
              {card.images.large || card.images.small ? (
                <Image
                  src={card.images.large || card.images.small}
                  alt={card.name}
                  width={240}
                  height={336}
                  className="h-[336px] w-[240px] rounded-xl object-cover"
                />
              ) : (
                <div className="h-[336px] w-[240px] rounded-xl bg-slate-700" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">{card.name}</h2>
              <p className="text-base text-text-secondary">
                {card.setName} #{card.number} · {card.rarity}
              </p>
              <p className="text-sm text-text-secondary">
                Market ~ ${card.tcgplayer.prices.normal?.market ?? card.tcgplayer.prices.holofoil?.market ?? "N/A"}
              </p>
            </div>
          </CardShell>

          <CardShell>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="askingPrice" className="text-base font-bold tracking-tight text-text-primary">
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
                  className={classes(
                    "min-h-14 w-full rounded-xl bg-slate-900 px-4 text-2xl font-bold tracking-tight text-text-primary",
                    "placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                  )}
                />
              </div>

              <div className="space-y-3">
                <p className="text-base font-bold tracking-tight text-text-primary">Condition</p>
                <ConditionPillSelector
                  value={condition}
                  onChange={setCondition}
                  options={CONDITIONS}
                />
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
