"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CardDetailSkeleton,
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
  const presetAsking = searchParams.get("asking");
  const presetCondition = searchParams.get("condition");

  const initialCondition = ((): Condition => {
    if (presetCondition === "NM" || presetCondition === "LP" || presetCondition === "MP" || presetCondition === "HP" || presetCondition === "DMG") {
      return presetCondition;
    }
    return "LP";
  })();

  const [card, setCard] = useState<CardDetail | null>(null);
  const [askingPrice, setAskingPrice] = useState(() => {
    if (!presetAsking) {
      return "";
    }
    const parsed = Number(presetAsking);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "";
    }
    return parsed.toFixed(2);
  });
  const [condition, setCondition] = useState<Condition>(initialCondition);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!cardId) {
        setLoading(false);
        setLoadError("Missing card id.");
        return;
      }

      setLoading(true);
      setLoadError(null);
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
        setLoadError(loadError instanceof Error ? loadError.message : "Failed to load card detail.");
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
  }, [cardId, reloadCount]);

  const parsedAskingPrice = useMemo(() => Number(askingPrice), [askingPrice]);
  const trimmedAskingPrice = askingPrice.trim();
  const hasEnteredAskingPrice = trimmedAskingPrice.length > 0;
  const hasNumericAskingPrice = Number.isFinite(parsedAskingPrice);
  const hasPositiveAskingPrice = hasNumericAskingPrice && parsedAskingPrice > 0;
  const hasTooManyDecimals = /^\d+(\.\d{3,})$/.test(trimmedAskingPrice);
  const isAskingPriceTooHigh = hasNumericAskingPrice && parsedAskingPrice > 100000;
  const askingPriceError = useMemo(() => {
    if (!hasEnteredAskingPrice) {
      return "Enter the asking price to continue.";
    }
    if (!hasNumericAskingPrice) {
      return "Enter a valid number like 125 or 125.50.";
    }
    if (!hasPositiveAskingPrice) {
      return "Asking price must be greater than $0.";
    }
    if (hasTooManyDecimals) {
      return "Use no more than 2 decimal places.";
    }
    if (isAskingPriceTooHigh) {
      return "Please enter a realistic asking price.";
    }
    return null;
  }, [
    hasEnteredAskingPrice,
    hasNumericAskingPrice,
    hasPositiveAskingPrice,
    hasTooManyDecimals,
    isAskingPriceTooHigh,
  ]);
  const canSubmit =
    !!card &&
    !askingPriceError &&
    !submitting &&
    !loading;

  const backHref = searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!card || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const mode = getEvaluationMode();
      const result = await postEvaluateCard({
        cardId: card.id,
        askingPrice: parsedAskingPrice,
        condition,
        mode,
      });
      setLastEvaluation(JSON.stringify(result));
      router.prefetch(`/card/${encodeURIComponent(card.id)}/result`);
      router.push(`/card/${encodeURIComponent(card.id)}/result`);
    } catch (submitError) {
      setSubmitError(submitError instanceof Error ? submitError.message : "Failed to evaluate card.");
    } finally {
      setSubmitting(false);
    }
  };

  const marketHint = useMemo(() => {
    if (!card) {
      return "N/A";
    }
    const preferred = ["normal", "holofoil", "reverseHolofoil"];
    const entries = Object.entries(card.tcgplayer.prices);
    const ordered = [
      ...preferred
        .filter((variant) => card.tcgplayer.prices[variant])
        .map((variant) => [variant, card.tcgplayer.prices[variant]] as const),
      ...entries.filter(([variant]) => !preferred.includes(variant)),
    ];

    for (const [, point] of ordered) {
      if (typeof point.market === "number") {
        return point.market.toFixed(2);
      }
      if (typeof point.mid === "number") {
        return point.mid.toFixed(2);
      }
      if (typeof point.low === "number") {
        return point.low.toFixed(2);
      }
    }

    return "N/A";
  }, [card]);

  return (
    <PageShell title="Card detail" subtitle="Set the price and get a fast recommendation.">
      <CardShell>
        <Link href={backHref} className="text-base font-semibold text-text-secondary">
          Back
        </Link>
      </CardShell>

      {loading ? <CardDetailSkeleton /> : null}

      {loadError ? (
        <CardShell className="space-y-3">
          <p className="text-base text-walk">{loadError}</p>
          <PrimaryButton onClick={() => setReloadCount((current) => current + 1)} variant="surface">
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
                Market ~ ${marketHint}
              </p>
              <p className="text-xs text-text-secondary">
                Based on market listings. Live show prices and card condition can vary.
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
                {askingPriceError ? (
                  <p className="text-sm font-semibold text-negotiate">{askingPriceError}</p>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Nice. Tap the button below when the price looks right.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-base font-bold tracking-tight text-text-primary">Condition</p>
                <ConditionPillSelector
                  value={condition}
                  onChange={setCondition}
                  options={CONDITIONS}
                />
              </div>

              {submitError ? (
                <p className="text-sm font-semibold text-walk">
                  {submitError} Please try again in a moment.
                </p>
              ) : null}

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
