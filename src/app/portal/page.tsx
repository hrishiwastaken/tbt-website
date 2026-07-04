import Link from "next/link";
import { ArrowRight, Calendar, IndianRupee, FileText } from "lucide-react";
import Surface from "../../components/ui/Surface";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import PrototypeBanner from "../../components/PrototypeBanner";

const MOCK_UPCOMING = {
  service: "Individual Counselling",
  therapist: "Dr. Madhumati Dhumak",
  date: "Fri, 12 Jul 2026",
  time: "4:30 PM",
  mode: "Online",
};

const MOCK_RECENT = [
  { service: "Individual Counselling", date: "28 Jun 2026", status: "Completed" },
  { service: "Individual Counselling", date: "14 Jun 2026", status: "Completed" },
];

export default function PortalDashboard() {
  return (
    <div>
      <PrototypeBanner label="Client Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">
        Welcome back
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Surface variant="raised" radius="surface" className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cormorant text-xl font-semibold text-ocean-deep">Upcoming Appointment</h2>
            <Badge tone="gold">{MOCK_UPCOMING.mode}</Badge>
          </div>
          <p className="text-lg text-ocean-deep font-medium">{MOCK_UPCOMING.service}</p>
          <p className="text-sm text-ink-muted mb-4">with {MOCK_UPCOMING.therapist}</p>
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Calendar className="w-4 h-4 text-ocean" />
            {MOCK_UPCOMING.date} at {MOCK_UPCOMING.time}
          </div>
        </Surface>

        <Surface variant="raised" radius="surface" className="p-6 flex flex-col justify-between">
          <h2 className="font-cormorant text-xl font-semibold text-ocean-deep mb-2">Book a Session</h2>
          <p className="text-sm text-ink-muted mb-4">Schedule your next appointment.</p>
          <Button href="/book" size="sm">
            Book Appointment
          </Button>
        </Surface>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface variant="raised" radius="surface" className="p-6">
          <h2 className="font-cormorant text-xl font-semibold text-ocean-deep mb-4">Previous Appointments</h2>
          <div className="space-y-3">
            {MOCK_RECENT.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-ocean/10 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-ocean-deep font-medium">{a.service}</p>
                  <p className="text-ink-muted text-xs">{a.date}</p>
                </div>
                <Badge tone="sand">{a.status}</Badge>
              </div>
            ))}
          </div>
          <Link href="/portal/appointments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-deep mt-4 transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </Surface>

        <div className="grid grid-cols-2 gap-6">
          <Surface variant="raised" radius="surface" className="p-6 flex flex-col justify-between">
            <IndianRupee className="w-6 h-6 text-ocean mb-3" />
            <p className="text-sm text-ink-muted mb-3">View payment history</p>
            <Link href="/portal/payments" className="text-sm font-semibold text-ocean hover:text-ocean-deep transition-colors">
              Payments
            </Link>
          </Surface>
          <Surface variant="raised" radius="surface" className="p-6 flex flex-col justify-between">
            <FileText className="w-6 h-6 text-ocean mb-3" />
            <p className="text-sm text-ink-muted mb-3">Download receipts</p>
            <Link href="/portal/invoices" className="text-sm font-semibold text-ocean hover:text-ocean-deep transition-colors">
              Invoices
            </Link>
          </Surface>
        </div>
      </div>
    </div>
  );
}
