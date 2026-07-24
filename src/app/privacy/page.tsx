import React from "react";
import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import {
  SITE_LEGAL_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
} from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_LEGAL_NAME}`,
  description:
    "How The Brain Tea Mental Health Clinic collects, uses, protects, and shares your personal, clinical, and payment information, including payments processed through PhonePe.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      currentPath="/privacy"
      intro="Your privacy is fundamental to the trust at the heart of our clinical relationship. This policy explains what information we collect, why we collect it, and how we keep it safe."
    >
      <p>
        {SITE_LEGAL_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;,
        or &ldquo;the Clinic&rdquo;) operates the website{" "}
        <a href={SITE_URL}>{SITE_URL}</a> and provides mental health and
        psychotherapy services. We are committed to protecting the privacy of
        our clients and website visitors and to handling personal data in
        accordance with the Information Technology Act, 2000, the Information
        Technology (Reasonable Security Practices and Procedures and Sensitive
        Personal Data or Information) Rules, 2011, and other applicable Indian
        law.
      </p>
      <p>
        By using our website, booking a session, or making a payment, you
        consent to the practices described in this Privacy Policy.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect the following categories of information:</p>
      <ul>
        <li>
          <strong>Personal identification:</strong> your name, email address,
          phone number, and, where relevant, age, gender, and emergency contact
          details.
        </li>
        <li>
          <strong>Clinical &amp; sensitive information:</strong> details you
          share for the purpose of therapy, such as your reason for seeking
          support, appointment history, and clinical notes recorded by your
          therapist. This is treated as sensitive personal data.
        </li>
        <li>
          <strong>Booking information:</strong> the service selected, appointment
          date and time, chosen consultant, and mode of session (in-person or
          online).
        </li>
        <li>
          <strong>Payment information:</strong> the amount, currency, invoice
          number, transaction reference, and payment status of each booking.{" "}
          <strong>
            We do not collect or store your card number, UPI PIN, bank
            credentials, or CVV.
          </strong>{" "}
          These are entered directly on the secure PhonePe payment page and are
          handled entirely by PhonePe.
        </li>
        <li>
          <strong>Technical information:</strong> IP address, browser type,
          device information, and cookies collected automatically when you use
          the website.
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use your information only for legitimate purposes, including to:</p>
      <ul>
        <li>schedule, confirm, reschedule, and manage your appointments;</li>
        <li>
          deliver therapy services and maintain accurate, confidential clinical
          records;
        </li>
        <li>
          process payments, issue invoices, and handle refunds through our
          payment gateway;
        </li>
        <li>
          send appointment reminders and service-related communications by
          email, SMS, or WhatsApp;
        </li>
        <li>respond to your enquiries and provide customer support;</li>
        <li>
          comply with legal, accounting, and regulatory obligations, and detect
          or prevent fraud.
        </li>
      </ul>

      <h2>3. Clinical Confidentiality</h2>
      <p>
        Everything you discuss in a session is strictly confidential.
        Information about your care is shared only with your explicit written
        consent, except in the rare circumstances mandated by law &mdash; for
        example, where there is an imminent risk of serious harm to you or
        others, or where disclosure is required by a court or statutory
        authority. Our practitioners work within the ethical guidelines of the
        Rehabilitation Council of India (RCI).
      </p>

      <h2>4. Payments and PhonePe</h2>
      <p>
        Online payments on our website are processed through{" "}
        <strong>PhonePe Payment Gateway</strong>, a third-party payment
        aggregator regulated by the Reserve Bank of India. When you make a
        payment:
      </p>
      <ul>
        <li>
          you are redirected to PhonePe&rsquo;s secure environment to complete
          the transaction using UPI, cards, net banking, or wallets;
        </li>
        <li>
          your sensitive payment credentials are collected and processed by
          PhonePe under their own privacy policy and PCI-DSS compliant
          infrastructure &mdash; not by us;
        </li>
        <li>
          we receive only a transaction reference, the amount, and the
          success or failure status, which we use to confirm your booking and
          for accounting.
        </li>
      </ul>
      <p>
        We encourage you to review{" "}
        <a
          href="https://www.phonepe.com/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          PhonePe&rsquo;s Privacy Policy
        </a>{" "}
        to understand how they handle your payment data.
      </p>

      <h2>5. How We Share Information</h2>
      <p>
        We do not sell or rent your personal information. We share it only with
        trusted service providers who help us operate, and only to the extent
        necessary:
      </p>
      <ul>
        <li>
          <strong>Payment processing:</strong> PhonePe, to collect payments and
          process refunds.
        </li>
        <li>
          <strong>Communications:</strong> our email and messaging providers to
          send confirmations and reminders.
        </li>
        <li>
          <strong>Hosting &amp; infrastructure:</strong> our website and
          database hosting providers.
        </li>
        <li>
          <strong>Legal &amp; regulatory bodies:</strong> where disclosure is
          required by law.
        </li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        Our website uses cookies and similar technologies to keep you signed in,
        remember your preferences, and understand how the site is used. You can
        control or disable cookies through your browser settings, though some
        features may not function correctly without them.
      </p>

      <h2>7. Data Security</h2>
      <p>
        We apply reasonable technical and organisational safeguards to protect
        your information, including encryption of sensitive clinical notes at
        rest, secure HTTPS transmission, access controls, and role-based
        permissions for staff. While we take security seriously, no method of
        electronic storage or transmission is completely secure, and we cannot
        guarantee absolute security.
      </p>

      <h2>8. Data Retention</h2>
      <p>
        We retain personal and clinical records for as long as necessary to
        provide our services and to meet our legal, professional, and accounting
        obligations. When information is no longer required, it is securely
        deleted or anonymised.
      </p>

      <h2>9. Your Rights</h2>
      <p>You may, subject to applicable law:</p>
      <ul>
        <li>request access to the personal information we hold about you;</li>
        <li>ask us to correct inaccurate or incomplete information;</li>
        <li>
          withdraw consent for non-essential communications at any time;
        </li>
        <li>
          request deletion of your information, where we are not required to
          retain it.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or{" "}
        {CONTACT_PHONE}.
      </p>

      <h2>10. Children&rsquo;s Privacy</h2>
      <p>
        Services for minors (under 18) are arranged and consented to by a parent
        or legal guardian. We collect a minor&rsquo;s information only with such
        consent and use it solely to provide the agreed care.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The revised version
        will be posted on this page with an updated &ldquo;Last updated&rdquo;
        date. Continued use of our website after changes take effect constitutes
        acceptance of the updated policy.
      </p>
    </LegalLayout>
  );
}
