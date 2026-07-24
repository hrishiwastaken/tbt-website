import Surface from "../../../components/ui/Surface";
import PrototypeBanner from "../../../components/PrototypeBanner";

export default function ProfilePage() {
  return (
    <div>
      <PrototypeBanner label="Client Portal" />
      <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-forest-slate mb-8">
        Profile
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Surface variant="raised" radius="surface" className="p-6">
          <h2 className="font-cormorant text-xl font-semibold text-forest-slate mb-4">
            Personal Information
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-charcoal/80">
                Name
              </dt>
              <dd className="text-forest-slate font-medium">Anjali Sharma</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-charcoal/80">
                Email
              </dt>
              <dd className="text-forest-slate font-medium">
                anjali@example.com
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-charcoal/80">
                Phone
              </dt>
              <dd className="text-forest-slate font-medium">+91 98765 43210</dd>
            </div>
          </dl>
        </Surface>

        <Surface variant="raised" radius="surface" className="p-6">
          <h2 className="font-cormorant text-xl font-semibold text-forest-slate mb-4">
            Emergency Contact
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-charcoal/80">
                Name
              </dt>
              <dd className="text-forest-slate font-medium">Rohan Sharma</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-charcoal/80">
                Phone
              </dt>
              <dd className="text-forest-slate font-medium">+91 98765 00000</dd>
            </div>
          </dl>
        </Surface>

        <Surface
          variant="raised"
          radius="surface"
          className="p-6 md:col-span-2"
        >
          <h2 className="font-cormorant text-xl font-semibold text-forest-slate mb-4">
            Consent &amp; Documents
          </h2>
          <p className="text-sm text-charcoal/80">
            GDPR consent form signed. No documents uploaded yet.
          </p>
        </Surface>
      </div>
    </div>
  );
}
