import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "buy" | "negotiate" | "walk";

function classes(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
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
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-800 text-white hover:bg-slate-900",
    ghost: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    buy: "bg-emerald-600 text-white hover:bg-emerald-700",
    negotiate: "bg-amber-500 text-slate-900 hover:bg-amber-600",
    walk: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes(
        "w-full rounded-xl px-4 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-4 sm:py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
