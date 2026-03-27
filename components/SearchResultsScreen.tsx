"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CardShell, PageShell, PrimaryButton, SearchResultItem } from "@/components/ui";
import { fetchSearchCards } from "@/lib/client/api";
import { addRecentSearch, getKidMode } from "@/lib/client/storage";
import type { SearchCard } from "@/lib/types";

export function SearchResultsScreen() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [results, setResults] = useState<SearchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kidMode, setKidModeState] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    setKidModeState(getKidMode());
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!query) {
        setLoading(false);
        setError(null);
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
  }, [query, reloadCount]);

  return (
    <PageShell
      title="Search results"
      subtitle={query ? `Matches for "${query}"` : "Search for a card to begin."}
    >
      <CardShell className="py-3">
        <Link href="/" className="inline-block text-base font-semibold text-text-secondary transition duration-150 active:scale-[0.98]">
          Back
        </Link>
      </CardShell>

      {kidMode ? (
        <CardShell className="py-4">
          <p className="text-base font-semibold text-negotiate">Kid Mode is on</p>
        </CardShell>
      ) : null}

      {loading ? (
        <CardShell className="py-5">
          <p className="text-base text-text-secondary">Searching cards...</p>
        </CardShell>
      ) : null}

      {error ? (
        <CardShell className="space-y-4">
          <p className="text-base text-walk">{error}</p>
          <PrimaryButton onClick={() => setReloadCount((current) => current + 1)} variant="ghost">
            Retry
          </PrimaryButton>
        </CardShell>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <CardShell className="py-5">
          <p className="text-base text-text-secondary">No cards found. Try another name.</p>
        </CardShell>
      ) : null}

      {!loading && !error && results.length > 0 ? (
        <ul className="space-y-4">
          {results.map((card) => (
            <li key={card.id}>
              <SearchResultItem
                card={card}
                href={`/card/${encodeURIComponent(card.id)}?q=${encodeURIComponent(query)}`}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </PageShell>
  );
}
