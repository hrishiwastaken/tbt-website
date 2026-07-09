import { Info } from "lucide-react";

export default function PrototypeBanner({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-soft bg-warm-sand/40 border border-muted-sage/25 px-4 py-3 text-xs text-charcoal/80 mb-8">
      <Info className="w-4 h-4 text-teal-sage shrink-0 mt-0.5" />
      <p>
        <strong className="text-forest-slate">{label}</strong> -- this is a visual prototype. It
        isn&apos;t yet connected to live data or authentication.
      </p>
    </div>
  );
}
