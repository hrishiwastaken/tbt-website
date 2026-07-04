import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS: Record<string, string[]> = {
  Mon: ["10:00 AM", "4:30 PM"],
  Wed: ["11:00 AM"],
  Fri: ["10:00 AM", "2:30 PM", "5:00 PM"],
};

export default function CalendarPage() {
  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">Calendar</h1>

      <Surface variant="raised" radius="surface" className="p-6 overflow-x-auto">
        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {DAYS.map((day) => (
            <div key={day}>
              <p className="text-xs uppercase tracking-wide text-ink-muted mb-3 text-center">{day}</p>
              <div className="space-y-2">
                {(SLOTS[day] || []).map((slot) => (
                  <div key={slot} className="surface-inset rounded-soft py-2 text-center text-xs text-ocean-deep font-medium">
                    {slot}
                  </div>
                ))}
                {!SLOTS[day] && (
                  <div className="text-center text-xs text-ink-muted/60 py-2">--</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <div className="mt-6 flex flex-wrap gap-3">
        <Badge tone="ocean">Weekly View</Badge>
        <Badge tone="sand">Availability managed by admin</Badge>
      </div>
    </div>
  );
}
