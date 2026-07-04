import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import PrototypeBanner from "../../../components/PrototypeBanner";
import { TEAM } from "../../../lib/team-data";

export default function TherapistProfilePage() {
  const t = TEAM[0];

  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">Profile</h1>

      <Surface variant="raised" radius="surface" className="p-6 md:p-8 max-w-2xl">
        <h2 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-1">{t.name}</h2>
        <p className="text-sm text-ocean font-medium mb-4">{t.role}</p>
        <Badge tone="sand" className="mb-6">
          {t.qualification}
        </Badge>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Experience</dt>
            <dd className="text-ocean-deep font-medium">{t.experience}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Fee</dt>
            <dd className="text-ocean-deep font-medium">{t.fee}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Languages</dt>
            <dd className="text-ocean-deep font-medium">{t.languages.join(", ")}</dd>
          </div>
        </dl>
      </Surface>
    </div>
  );
}
