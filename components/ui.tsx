import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatCurrency } from "@/lib/client/api";
import type { Condition, EvaluationResult, SearchCard } from "@/lib/types";

type ButtonVariant = "primary" | "surface" | "ghost" | "buy" | "negotiate" | "walk";

export function classes(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function resultColorClasses(result: EvaluationResult): string {
  if (result === "BUY") {
    return "bg-buy text-slate-50";
  }
  if (result === "NEGOTIATE") {
    return "bg-negotiate text-slate-900";
  }
  return "bg-walk text-slate-50";
}

function resultBorderClasses(result: EvaluationResult): string {
  if (result === "BUY") {
    return "border-buy/60";
  }
  if (result === "NEGOTIATE") {
    return "border-negotiate/70";
  }
  return "border-walk/60";
}

export function CardShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={classes(
        "rounded-2xl bg-surface/95 p-4 shadow-[0_6px_20px_rgba(2,6,23,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  type = "button",
  disabled,
  onClick,
  children,
  className,
  variant = "primary",
}: {
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
}) {
  const variantClass = {
    primary: "bg-slate-50 text-slate-950",
    surface: "bg-surface text-text-primary",
    ghost: "bg-slate-700/70 text-text-primary",
    buy: "bg-buy text-slate-50",
    negotiate: "bg-negotiate text-slate-950",
    walk: "bg-walk text-slate-50",
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes(
        "w-full min-h-14 rounded-xl px-4 py-3 text-base font-bold tracking-tight transition duration-200",
        "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
        variantClass,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-4 py-7">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">{title}</h1>
        {subtitle ? <p className="max-w-[38ch] text-base text-text-secondary">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}

export function ResultBadge({
  result,
  kidMode,
}: {
  result: EvaluationResult;
  kidMode: boolean;
}) {
  const kidModeLabel = {
    BUY: "Good deal!",
    NEGOTIATE: "Ask lower",
    WALK: "Too expensive",
  }[result];
  const label = kidMode ? kidModeLabel : result;

  return (
    <div
      className={classes(
        "rounded-3xl px-5 py-8 text-center shadow-[0_10px_30px_rgba(2,6,23,0.42)]",
        resultColorClasses(result),
      )}
    >
      <p className="text-xs font-bold tracking-[0.18em] uppercase opacity-90">Result</p>
      <p className="mt-2 text-6xl font-black tracking-tight">{label}</p>
    </div>
  );
}

export function PriceBreakdown({
  askingPrice,
  marketPrice,
  differenceAmount,
  differencePercent,
  kidMode,
}: {
  askingPrice: number;
  marketPrice: number;
  differenceAmount: number;
  differencePercent: number;
  kidMode: boolean;
}) {
  const positive = differenceAmount > 0;
  const differenceColor = positive ? "text-walk" : "text-buy";

  return (
    <CardShell className="space-y-3">
      <h3 className="text-lg font-bold tracking-tight text-text-primary">Price check</h3>
      <dl className="space-y-3 text-base">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Asking</dt>
          <dd className="font-bold text-text-primary">{formatCurrency(askingPrice)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Market</dt>
          <dd className="font-bold text-text-primary">{formatCurrency(marketPrice)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Difference</dt>
          <dd className={classes("font-extrabold", differenceColor)}>
            {positive ? "+" : ""}
            {formatCurrency(differenceAmount)}
            {!kidMode ? ` (${positive ? "+" : ""}${differencePercent}%)` : ""}
          </dd>
        </div>
      </dl>
    </CardShell>
  );
}

export function ScriptCard({
  script,
  onCopy,
  copied,
}: {
  script: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <li className="space-y-3 rounded-2xl bg-slate-800/80 p-4">
      <p className="text-base leading-relaxed text-text-primary">{script}</p>
      <PrimaryButton variant="ghost" className="min-h-11 text-sm font-semibold" onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </PrimaryButton>
    </li>
  );
}

export function ConditionPillSelector({
  value,
  onChange,
  options,
}: {
  value: Condition;
  onChange: (value: Condition) => void;
  options: Condition[];
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={classes(
              "min-h-12 rounded-full px-3 text-sm font-bold transition duration-150",
              "active:scale-[0.98]",
              active
                ? "border border-negotiate bg-negotiate text-slate-950"
                : "bg-slate-800 text-text-primary",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function SearchResultItem({
  card,
  href,
}: {
  card: SearchCard;
  href: string;
}) {
  return (
    <Link href={href} className="block active:scale-[0.99] transition duration-150">
      <CardShell className={classes("flex items-center gap-4 border", resultBorderClasses("NEGOTIATE"))}>
        {card.imageSmall ? (
          <Image
            src={card.imageSmall}
            alt={card.name}
            width={88}
            height={124}
            className="h-[124px] w-[88px] shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-[124px] w-[88px] shrink-0 rounded-lg bg-slate-700" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xl font-bold tracking-tight text-text-primary">{card.name}</p>
          <p className="text-sm text-text-secondary">
            {card.setName} #{card.number}
          </p>
        </div>
      </CardShell>
    </Link>
  );
}
