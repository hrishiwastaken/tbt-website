import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";

const PAYMENTS = [
  { service: "Individual Counselling", date: "28 Jun 2026", amount: "₹1,500", status: "Paid" },
  { service: "Individual Counselling", date: "14 Jun 2026", amount: "₹1,500", status: "Paid" },
];

export default function PaymentsPage() {
  return (
    <div>
      <PrototypeBanner label="Client Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">
        Payments
      </h1>

      <Surface variant="raised" radius="surface" className="overflow-hidden">
        <div className="divide-y divide-ocean/10">
          {PAYMENTS.map((p, i) => (
            <div key={i} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ocean-deep font-medium">{p.service}</p>
                <p className="text-ink-muted text-xs">{p.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-cormorant text-lg font-semibold text-ocean-deep">{p.amount}</span>
                <Badge tone="gold">{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
