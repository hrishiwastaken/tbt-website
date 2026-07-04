import Link from "next/link";
import Surface from "../../../components/ui/Surface";
import Button from "../../../components/ui/Button";
import { SITE_NAME } from "../../../lib/site";

export const metadata = {
  title: "Consultant Login | The Brain Tea",
};

export default function TherapistLoginPage() {
  return (
    <main className="min-h-screen bg-ivory flex flex-col justify-center items-center px-6 font-dmsans">
      <Surface variant="raised" radius="panel" className="w-full max-w-md p-8 md:p-12 text-center">
        <Link href="/" className="font-cormorant font-semibold text-3xl text-ocean-deep block mb-2">
          {SITE_NAME}
        </Link>
        <span className="text-xs font-bold tracking-widest text-ocean uppercase block mb-8">
          Consultant Portal
        </span>

        <p className="text-sm text-ink-muted leading-relaxed mb-8">
          This portal is a visual prototype -- consultant authentication isn&apos;t built yet.
          Use the button below to preview the dashboard design.
        </p>

        <Button href="/therapist" size="lg" className="w-full">
          Preview Dashboard
        </Button>

        <div className="mt-8 border-t border-ocean/10 pt-4">
          <Link href="/admin/login" className="text-xs text-ink-muted hover:text-ocean-deep transition-colors">
            ← Admin Login
          </Link>
        </div>
      </Surface>
    </main>
  );
}
