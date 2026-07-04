import { Info } from "lucide-react";

export default function PrototypeBanner({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-soft surface-inset px-4 py-3 text-xs text-ink-muted mb-8">
      <Info className="w-4 h-4 text-ocean shrink-0 mt-0.5" />
      <p>
        <strong className="text-ocean-deep">{label}</strong> -- this is a visual prototype. It
        isn&apos;t yet connected to live data or authentication.
      </p>
    </div>
  );
}
