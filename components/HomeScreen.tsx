"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CardShell, PageShell, PrimaryButton, classes } from "@/components/ui";
import { addRecentSearch, getKidMode, getRecentSearches, setKidMode } from "@/lib/client/storage";

export function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [kidMode, setKidModeState] = useState<boolean>(() => getKidMode());
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    getRecentSearches(),
  );

  const canSearch = useMemo(() => query.trim().length > 1 && !isPending, [isPending, query]);

  const goToSearch = (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      return;
    }
    const nextSearches = addRecentSearch(trimmed);
    setRecentSearches(nextSearches);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    });
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
    <PageShell title="CardPal" subtitle="Know when to buy, negotiate, or walk.">
      <form className="space-y-3" onSubmit={onSubmit}>
        <label htmlFor="search" className="sr-only">
          Search card name
        </label>
        <div className="rounded-2xl bg-surface p-2 shadow-[0_12px_30px_rgba(2,6,23,0.45)]">
          <input
            id="search"
            type="text"
            value={query}
            placeholder="Search any card"
            onChange={(event) => setQuery(event.target.value)}
            className={classes(
              "min-h-14 w-full rounded-xl bg-slate-900 px-4 text-lg font-semibold tracking-tight text-text-primary",
              "placeholder:text-text-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
            )}
          />
        </div>
        <PrimaryButton type="submit" disabled={!canSearch}>
          {isPending ? "Opening results..." : "Find Card"}
        </PrimaryButton>
      </form>

      <CardShell className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-bold tracking-tight text-text-primary">Kid Mode</p>
          <button
            type="button"
            onClick={onToggleKidMode}
            role="switch"
            aria-checked={kidMode}
            className={classes(
              "relative h-9 w-16 rounded-full transition-colors duration-200 active:scale-[0.98]",
              kidMode ? "bg-buy" : "bg-slate-700",
            )}
          >
            <span
              className={classes(
                "absolute top-1 h-7 w-7 rounded-full bg-slate-100 transition-all duration-200",
                kidMode ? "left-8" : "left-1",
              )}
            />
          </button>
        </div>
        <p className="text-sm text-text-secondary">
          Shorter language, more color, and easier recommendations.
        </p>
      </CardShell>

      <CardShell className="space-y-4">
        <p className="text-base font-bold tracking-tight text-text-primary">Recent searches</p>
        {recentSearches.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No recent searches yet. Your last lookups will show here.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex gap-3">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => goToSearch(item)}
                className="min-w-28 shrink-0 rounded-2xl bg-slate-800/90 p-2 text-left transition duration-150 active:scale-[0.97]"
              >
                <div className="h-20 w-full rounded-xl bg-slate-700/80" />
                <p className="mt-2 truncate text-sm font-semibold text-text-primary">{item}</p>
              </button>
            ))}
            </div>
          </div>
        )}
      </CardShell>
    </PageShell>
  );
}
