import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";

const APPOINTMENTS = [
  { client: "Anjali Sharma", service: "Individual Counselling", date: "12 Jul 2026", time: "10:00 AM", status: "Confirmed" },
  { client: "Rohan Mehta", service: "Individual Counselling", date: "13 Jul 2026", time: "2:30 PM", status: "Confirmed" },
  { client: "Anjali Sharma", service: "Individual Counselling", date: "28 Jun 2026", time: "10:00 AM", status: "Completed" },
];

export default function TherapistAppointmentsPage() {
  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-2">Appointments</h1>
      <p className="text-sm text-ink-muted mb-8 max-w-xl">
        Schedule changes are managed by the clinic administrator.
      </p>

      <Surface variant="raised" radius="surface" className="overflow-hidden">
        <div className="divide-y divide-ocean/10">
          {APPOINTMENTS.map((a, i) => (
            <div key={i} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ocean-deep font-medium">{a.client}</p>
                <p className="text-ink-muted text-xs">
                  {a.service} -- {a.date} at {a.time}
                </p>
              </div>
              <Badge tone={a.status === "Confirmed" ? "gold" : "ocean"}>{a.status}</Badge>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
