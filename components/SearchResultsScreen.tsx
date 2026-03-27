"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CardShell, PageShell, PrimaryButton } from "@/components/ui";
import { fetchSearchCards } from "@/lib/client/api";
import { addRecentSearch, getKidMode } from "@/lib/client/storage";
import type { SearchCard } from "@/lib/types";

function classes(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SearchResultsScreen() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [results, setResults] = useState<SearchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kidMode, setKidModeState] = useState(false);

  useEffect(() => {
    setKidModeState(getKidMode());
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!query) {
        setLoading(false);
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchSearchCards(query);
        if (!active) {
          return;
        }
        setResults(response.results);
        addRecentSearch(query);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load search results.");
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
  }, [query]);

  return (
    <PageShell title="Search Results" subtitle={query ? `Showing matches for "${query}"` : "Search for a card to begin."}>
      <CardShell>
        <Link href="/" className="text-sm font-medium text-blue-700">
          ← Back to search
        </Link>
      </CardShell>

      {kidMode ? (
        <CardShell className="text-sm text-slate-700">
          Kid mode is ON. Recommendation scripts will use friendlier wording.
        </CardShell>
      ) : null}

      {loading ? (
        <CardShell>
          <p className="text-sm text-slate-600">Searching cards...</p>
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

      {!loading && !error && results.length === 0 ? (
        <CardShell>
          <p className="text-sm text-slate-600">No cards found. Try a different card name.</p>
        </CardShell>
      ) : null}

      {!loading && !error && results.length > 0 ? (
        <ul className="space-y-3">
          {results.map((card) => (
            <li key={card.id}>
              <Link
                href={`/card/${encodeURIComponent(card.id)}?q=${encodeURIComponent(query)}`}
                className="block"
              >
                <CardShell className="flex items-center gap-3 active:scale-[0.99]">
                  {card.imageSmall ? (
                    <Image
                      src={card.imageSmall}
                      alt={card.name}
                      width={72}
                      height={100}
                      className="h-[100px] w-[72px] rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-[100px] w-[72px] rounded-md bg-slate-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">{card.name}</p>
                    <p className="text-sm text-slate-600">
                      {card.setName} • #{card.number}
                    </p>
                    <p
                      className={classes(
                        "text-xs",
                        card.rarity === "Rare Holo"
                          ? "font-semibold text-amber-700"
                          : "text-slate-500",
                      )}
                    >
                      {card.rarity}
                    </p>
                  </div>
                </CardShell>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </PageShell>
  );
}
