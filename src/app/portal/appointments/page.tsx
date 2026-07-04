import { PhoneCall } from "lucide-react";
import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";
import { WHATSAPP_URL, CONTACT_PHONE } from "../../../lib/site";

const APPOINTMENTS = [
  { service: "Individual Counselling", date: "12 Jul 2026", time: "4:30 PM", mode: "Online", status: "Confirmed" },
  { service: "Individual Counselling", date: "28 Jun 2026", time: "5:00 PM", mode: "Offline", status: "Completed" },
  { service: "Individual Counselling", date: "14 Jun 2026", time: "5:00 PM", mode: "Offline", status: "Completed" },
];

export default function AppointmentsPage() {
  return (
    <div>
      <PrototypeBanner label="Client Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-2">
        My Appointments
      </h1>
      <p className="text-sm text-ink-muted mb-8 max-w-xl">
        To reschedule or cancel a session, please contact the clinic directly -- this can&apos;t be
        done from the portal.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <a
          href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-ocean text-white px-5 py-2.5 rounded-full shadow-surface-raised-sm hover:shadow-surface-raised transition-all"
        >
          <PhoneCall className="w-4 h-4" /> Call Clinic
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold bg-[#25D366] text-white px-5 py-2.5 rounded-full hover:shadow-surface-raised transition-all"
        >
          WhatsApp
        </a>
      </div>

      <Surface variant="raised" radius="surface" className="overflow-hidden">
        <div className="divide-y divide-ocean/10">
          {APPOINTMENTS.map((a, i) => (
            <div key={i} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ocean-deep font-medium">{a.service}</p>
                <p className="text-ink-muted text-xs">
                  {a.date} at {a.time}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="sand">{a.mode}</Badge>
                <Badge tone={a.status === "Confirmed" ? "gold" : "ocean"}>{a.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
