import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";

const CLIENTS = [
  { name: "Anjali Sharma", age: 29, gender: "Female", nextSession: "12 Jul 2026", totalSessions: 6 },
  { name: "Rohan Mehta", age: 34, gender: "Male", nextSession: "13 Jul 2026", totalSessions: 3 },
];

export default function ClientsPage() {
  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">My Clients</h1>

      <Surface variant="raised" radius="surface" className="overflow-hidden">
        <div className="divide-y divide-ocean/10">
          {CLIENTS.map((c) => (
            <div key={c.name} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ocean-deep font-medium">{c.name}</p>
                <p className="text-ink-muted text-xs">
                  {c.age} yrs -- {c.gender}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="sand">{c.totalSessions} sessions</Badge>
                <span className="text-xs text-ink-muted">Next: {c.nextSession}</span>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
