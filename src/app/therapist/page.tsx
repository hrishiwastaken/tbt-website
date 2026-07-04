import Link from "next/link";
import { ArrowRight, IndianRupee } from "lucide-react";
import Surface from "../../components/ui/Surface";
import Badge from "../../components/ui/Badge";
import PrototypeBanner from "../../components/PrototypeBanner";

const TODAY = [
  { time: "10:00 AM", client: "Anjali Sharma", service: "Individual Counselling", mode: "Online" },
  { time: "2:30 PM", client: "Rohan Mehta", service: "Individual Counselling", mode: "Offline" },
];

export default function TherapistDashboard() {
  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">
        Good morning
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Surface variant="raised" radius="surface" className="p-6">
          <p className="text-xs uppercase tracking-wide text-ink-muted mb-2">Today&apos;s Sessions</p>
          <p className="font-cormorant text-3xl font-semibold text-ocean-deep">{TODAY.length}</p>
        </Surface>
        <Surface variant="raised" radius="surface" className="p-6">
          <p className="text-xs uppercase tracking-wide text-ink-muted mb-2">This Week</p>
          <p className="font-cormorant text-3xl font-semibold text-ocean-deep">11</p>
        </Surface>
        <Surface variant="raised" radius="surface" className="p-6">
          <p className="text-xs uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-1">
            <IndianRupee className="w-3 h-3" /> Pending Payments
          </p>
          <p className="font-cormorant text-3xl font-semibold text-ocean-deep">2</p>
        </Surface>
      </div>

      <Surface variant="raised" radius="surface" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cormorant text-xl font-semibold text-ocean-deep">Today&apos;s Appointments</h2>
          <Link href="/therapist/calendar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-deep transition-colors">
            View Calendar <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-ocean/10">
          {TODAY.map((a, i) => (
            <div key={i} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ocean-deep font-medium">{a.client}</p>
                <p className="text-ink-muted text-xs">{a.service} -- {a.time}</p>
              </div>
              <Badge tone="sand">{a.mode}</Badge>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
