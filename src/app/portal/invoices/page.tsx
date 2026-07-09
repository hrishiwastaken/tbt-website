import { Download } from "lucide-react";
import Surface from "../../../components/ui/Surface";
import PrototypeBanner from "../../../components/PrototypeBanner";

const INVOICES = [
  { id: "INV-0012", date: "28 Jun 2026", amount: "₹1,500" },
  { id: "INV-0009", date: "14 Jun 2026", amount: "₹1,500" },
];

export default function InvoicesPage() {
  return (
    <div>
      <PrototypeBanner label="Client Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-forest-slate mb-8">
        Invoices &amp; Receipts
      </h1>

      <Surface variant="raised" radius="surface" className="overflow-hidden">
        <div className="divide-y divide-ocean/10">
          {INVOICES.map((inv) => (
            <div key={inv.id} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-forest-slate font-medium">{inv.id}</p>
                <p className="text-charcoal/80 text-xs">{inv.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-cormorant text-lg font-semibold text-forest-slate">{inv.amount}</span>
                <button
                  type="button"
                  disabled
                  title="Prototype -- download not yet wired up"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-sage disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
