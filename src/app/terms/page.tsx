import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";
import { SITE_LEGAL_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms & Conditions | ${SITE_LEGAL_NAME}`,
  description:
    "The terms governing your use of The Brain Tea Mental Health Clinic's website, booking, and payment services, including fees paid via PhonePe.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      currentPath="/terms"
      intro="These terms set out the agreement between you and our clinic when you use our website, book a session, or make a payment. Please read them carefully."
    >
      <p>
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to
        and use of the website <a href={SITE_URL}>{SITE_URL}</a> and the
        services offered by {SITE_LEGAL_NAME} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Clinic&rdquo;). By
        using our website or booking a session, you agree to be bound by these
        Terms. If you do not agree, please do not use our services.
      </p>

      <h2>1. Services</h2>
      <p>
        We provide mental health and psychotherapy services, including
        individual, couples, and family therapy, delivered in person at our
        clinic in Pune or online via secure video consultation. Our services
        support emotional wellbeing and are not a substitute for emergency
        medical or psychiatric care.
      </p>
      <p>
        <strong>Not for emergencies.</strong> Our services are not designed for
        crisis or emergency situations. If you or someone else is in immediate
        danger or experiencing a medical or psychiatric emergency, call your
        local emergency services or a crisis helpline immediately.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to book a session and make a payment
        in your own name. Sessions for minors must be arranged and consented to
        by a parent or legal guardian, who accepts these Terms on the
        minor&rsquo;s behalf.
      </p>

      <h2>3. Booking Appointments</h2>
      <p>
        Appointments may be requested through our website, by phone, or via
        WhatsApp. A booking is confirmed only once the applicable fee has been
        successfully paid and you have received a confirmation from us. We
        reserve the right to decline or reschedule a booking where a suitable
        consultant or slot is unavailable.
      </p>

      <h2>4. Fees and Payment</h2>
      <ul>
        <li>
          All fees are quoted and charged in Indian Rupees (INR) and are
          inclusive of applicable taxes unless stated otherwise.
        </li>
        <li>
          Current session fees are shown on our{" "}
          <Link href="/services">Services</Link> and booking pages at the time
          of booking.
        </li>
        <li>
          Online payments are processed securely through the{" "}
          <strong>PhonePe Payment Gateway</strong> using UPI, cards, net
          banking, or wallets. By making a payment you also agree to
          PhonePe&rsquo;s applicable terms.
        </li>
        <li>
          Your booking is reserved for a limited time while payment is
          completed; if payment is not received in that window, the slot is
          released.
        </li>
      </ul>

      <h2>5. Cancellations, Rescheduling &amp; Refunds</h2>
      <p>
        Cancellations, rescheduling, and refunds are governed by our{" "}
        <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>,
        which forms part of these Terms. In summary, sessions cancelled with at least
        24 hours&rsquo; notice are eligible for a refund or reschedule, while
        late cancellations and no-shows are charged in full.
      </p>

      <h2>6. Your Responsibilities</h2>
      <p>When using our services, you agree to:</p>
      <ul>
        <li>provide accurate and complete information when booking;</li>
        <li>
          attend sessions on time and inform us promptly if you need to cancel
          or reschedule;
        </li>
        <li>
          for online sessions, ensure a stable internet connection and a
          private, quiet space;
        </li>
        <li>
          engage respectfully with our practitioners and staff, and not use our
          services for any unlawful purpose.
        </li>
      </ul>

      <h2>7. Confidentiality</h2>
      <p>
        We treat your information and everything shared in session as
        confidential in accordance with our{" "}
        <Link href="/privacy">Privacy Policy</Link> and applicable professional
        and legal standards.
      </p>

      <h2>8. Intellectual Property</h2>
      <p>
        All content on this website &mdash; including text, graphics, logos, and
        design &mdash; is the property of {SITE_LEGAL_NAME} or its licensors and
        is protected by applicable intellectual property laws. You may not
        reproduce, distribute, or commercially exploit any content without our
        prior written permission.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any
        indirect, incidental, or consequential loss arising from your use of the
        website or services. Nothing in these Terms limits our liability where
        it cannot be excluded under applicable law. Therapy outcomes vary from
        person to person, and we do not guarantee any specific result.
      </p>

      <h2>10. Governing Law and Jurisdiction</h2>
      <p>
        These Terms are governed by the laws of India. Any disputes arising out
        of or in connection with these Terms shall be subject to the exclusive
        jurisdiction of the competent courts at Pune, Maharashtra.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. The current version will
        always be available on this page with an updated &ldquo;Last
        updated&rdquo; date. Continued use of our services after changes take
        effect constitutes acceptance of the revised Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        For any questions about these Terms, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or through our{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </LegalLayout>
  );
}
