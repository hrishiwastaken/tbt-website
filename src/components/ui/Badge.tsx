import { ReactNode } from "react";

type Tone = "ocean" | "gold" | "blush" | "sand";

const toneClasses: Record<Tone, string> = {
  ocean: "bg-ocean/10 text-ocean-deep border-ocean/20",
  gold: "bg-gold/40 text-ocean-deep border-gold/60",
  blush: "bg-blush/60 text-ocean-deep border-blush",
  sand: "bg-sand/30 text-ocean-deep border-sand/50",
};

export default function Badge({
  children,
  tone = "ocean",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
