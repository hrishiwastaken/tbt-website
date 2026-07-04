import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";

const PAYMENTS = [
  { client: "Anjali Sharma", date: "28 Jun 2026", amount: "₹1,500", status: "Paid" },
  { client: "Rohan Mehta", date: "20 Jun 2026", amount: "₹1,500", status: "Pending" },
];

export default function TherapistPaymentsPage() {
  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">Payments</h1>

      <Surface variant="raised" radius="surface" className="overflow-hidden">
        <div className="divide-y divide-ocean/10">
          {PAYMENTS.map((p, i) => (
            <div key={i} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ocean-deep font-medium">{p.client}</p>
                <p className="text-ink-muted text-xs">{p.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-cormorant text-lg font-semibold text-ocean-deep">{p.amount}</span>
                <Badge tone={p.status === "Paid" ? "gold" : "sand"}>{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
