import Surface from "../../../components/ui/Surface";
import PrototypeBanner from "../../../components/PrototypeBanner";

export default function SettingsPage() {
  return (
    <div>
      <PrototypeBanner label="Consultant Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-8">Settings</h1>

      <Surface variant="raised" radius="surface" className="p-6 md:p-8 max-w-2xl">
        <p className="text-sm text-ink-muted leading-relaxed">
          Notification preferences and account settings will appear here once account
          management is connected.
        </p>
      </Surface>
    </div>
  );
}
