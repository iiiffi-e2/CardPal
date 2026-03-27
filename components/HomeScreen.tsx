"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CardShell, PageShell, PrimaryButton } from "@/components/ui";
import { addRecentSearch, getKidMode, getRecentSearches, setKidMode } from "@/lib/client/storage";

export function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kidMode, setKidModeState] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setKidModeState(getKidMode());
    setRecentSearches(getRecentSearches());
  }, []);

  const canSearch = useMemo(() => query.trim().length > 1, [query]);

  const goToSearch = (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      return;
    }
    const nextSearches = addRecentSearch(trimmed);
    setRecentSearches(nextSearches);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToSearch(query);
  };

  const onToggleKidMode = () => {
    const next = !kidMode;
    setKidModeState(next);
    setKidMode(next);
  };

  return (
    <PageShell
      title="CardPal"
      subtitle="Scan the market and decide whether to BUY, NEGOTIATE, or WALK."
    >
      <CardShell className="space-y-3">
        <form className="space-y-3" onSubmit={onSubmit}>
          <label htmlFor="search" className="block text-sm font-medium text-slate-700">
            Search card name
          </label>
          <input
            id="search"
            type="text"
            value={query}
            placeholder="e.g. Charizard"
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none ring-blue-500 focus:ring-2"
          />
          <PrimaryButton type="submit" disabled={!canSearch}>
            Search Cards
          </PrimaryButton>
        </form>
      </CardShell>

      <CardShell className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Kid mode</p>
            <p className="text-xs text-slate-600">Friendlier script wording for younger collectors.</p>
          </div>
          <button
            type="button"
            onClick={onToggleKidMode}
            className={`h-10 min-w-20 rounded-full px-3 text-sm font-semibold transition ${
              kidMode ? "bg-amber-500 text-slate-900" : "bg-slate-200 text-slate-700"
            }`}
          >
            {kidMode ? "ON" : "OFF"}
          </button>
        </div>
      </CardShell>

      <CardShell className="space-y-2">
        <p className="text-sm font-semibold text-slate-900">Recent searches</p>
        {recentSearches.length === 0 ? (
          <p className="text-sm text-slate-500">No recent searches yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => goToSearch(item)}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </CardShell>
    </PageShell>
  );
}
