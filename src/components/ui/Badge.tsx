import { ReactNode } from "react";

type Tone = "ocean" | "gold" | "blush" | "sand";

const toneClasses: Record<Tone, string> = {
  ocean: "bg-teal-sage/10 text-forest-slate border-teal-sage/25",
  gold: "bg-warm-tan/50 text-forest-slate border-warm-tan/70",
  blush: "bg-warm-tan/35 text-forest-slate border-warm-tan/60",
  sand: "bg-warm-sand/50 text-forest-slate border-muted-sage/30",
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
