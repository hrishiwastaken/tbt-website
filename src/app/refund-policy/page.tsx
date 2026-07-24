import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";
import { SITE_LEGAL_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Refund & Cancellation Policy | ${SITE_LEGAL_NAME}`,
  description:
    "Our cancellation, rescheduling, and refund terms for therapy sessions, including refund timelines for payments made through PhonePe.",
  alternates: { canonical: `${SITE_URL}/refund-policy` },
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Refund & Cancellation Policy"
      currentPath="/refund-policy"
      intro="We understand that plans change. This policy explains how to cancel or reschedule a session and when you are eligible for a refund."
    >
      <p>
        This Refund &amp; Cancellation Policy applies to all appointments booked
        and paid for with {SITE_LEGAL_NAME} through our website, including
        payments made via the PhonePe Payment Gateway. By making a payment, you
        agree to the terms below.
      </p>

      <h2>1. Cancellation by You</h2>
      <ul>
        <li>
          <strong>48 hours or more before the session:</strong> you may cancel
          free of charge and request a full refund.
        </li>
        <li>
          <strong>Less than 48 hours before the session:</strong> the session is
          charged in full and is not eligible for a refund, as the slot was
          reserved exclusively for you.
        </li>
        <li>
          <strong>No-show:</strong> if you do not attend a confirmed session
          without notice, the full fee is retained and no refund is due.
        </li>
      </ul>
      <p>
        To cancel or reschedule, contact us by phone, WhatsApp, email, or
        through your account before the applicable deadline above.
      </p>

      <h2>2. Rescheduling</h2>
      <p>
        Sessions may be rescheduled at no charge when requested at least 24
        hours in advance, subject to consultant availability. A rescheduled
        session carries forward your original payment; no additional charge
        applies unless you move to a higher-priced service. Requests made less
        than 24 hours before the session are treated as a late cancellation and
        charged in full.
      </p>

      <h2>3. Cancellation by the Clinic</h2>
      <p>
        If we need to cancel or reschedule a session &mdash; for example, due to
        a practitioner&rsquo;s unavailability &mdash; we will offer you the
        earliest suitable alternative slot or, if you prefer, a{" "}
        <strong>full refund</strong> of the amount paid.
      </p>

      <h2>4. Duplicate &amp; Failed Payments</h2>
      <ul>
        <li>
          If you are charged more than once for the same booking, the duplicate
          amount is refunded in full to your original payment method.
        </li>
        <li>
          If money is debited but your booking is not confirmed (for example,
          due to a network or gateway error), the amount is either
          auto-reversed by PhonePe or refunded by us once the transaction is
          reconciled &mdash; you are not charged for a session you did not
          receive.
        </li>
      </ul>

      <h2>5. Refund Method and Timelines</h2>
      <ul>
        <li>
          Approved refunds are issued to the{" "}
          <strong>original payment method</strong> used at checkout (the same
          UPI account, card, or wallet) through PhonePe. We do not issue cash or
          third-party refunds.
        </li>
        <li>
          Once a refund is approved, we initiate it promptly. The amount is
          typically credited to your account within{" "}
          <strong>5 to 7 business days</strong>, depending on your bank or UPI
          provider&rsquo;s processing time.
        </li>
        <li>
          Refunds are made in Indian Rupees (INR) for the amount actually paid.
          Any applicable gateway or bank charges levied by third parties are
          outside our control.
        </li>
      </ul>

      <h2>6. How to Request a Refund</h2>
      <p>
        To request a refund, email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your name,
        booking date, and transaction reference, or contact us through our{" "}
        <Link href="/contact">Contact page</Link>. We aim to acknowledge every
        refund request within 2 business days.
      </p>

      <h2>7. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. The current version will
        always be available on this page with an updated &ldquo;Last
        updated&rdquo; date.
      </p>
    </LegalLayout>
  );
}
