import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";
import { SITE_LEGAL_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Shipping & Delivery Policy | ${SITE_LEGAL_NAME}`,
  description:
    "How The Brain Tea Mental Health Clinic delivers its services. We provide therapy sessions in person and online — no physical goods are shipped.",
  alternates: { canonical: `${SITE_URL}/shipping-policy` },
};

export default function ShippingPolicyPage() {
  return (
    <LegalLayout
      title="Shipping & Delivery Policy"
      currentPath="/shipping-policy"
      intro="We provide mental health services, not physical products. This policy explains how and when your sessions are delivered after booking."
    >
      <p>
        {SITE_LEGAL_NAME} offers therapy and counselling <strong>services</strong>.
        We do <strong>not sell or ship any physical goods</strong>, so no
        courier, shipping charges, or delivery addresses are involved. This
        policy describes how our services are delivered to you.
      </p>

      <h2>1. Booking Confirmation Delivery</h2>
      <p>
        As soon as your payment is successfully processed through the PhonePe
        Payment Gateway, your appointment is confirmed electronically. You will
        receive a confirmation &mdash; including the date, time, consultant, and
        session mode &mdash; by email and/or WhatsApp, usually within a few
        minutes of a successful payment.
      </p>

      <h2>2. How Sessions Are Delivered</h2>
      <ul>
        <li>
          <strong>In-person sessions</strong> are delivered at our clinic:{" "}
          Flat No. 8, 5th Floor, Abhimanshree Society, Baner-Pashan Link Road,
          above ICICI Direct, Pune - 411008, at the scheduled time.
        </li>
        <li>
          <strong>Online sessions</strong> are delivered over a secure video
          consultation. A joining link and instructions are shared with you
          ahead of the appointment.
        </li>
      </ul>

      <h2>3. Delivery Timeline</h2>
      <p>
        Services are delivered at the appointment date and time you select
        during booking. Appointment reminders are sent ahead of your session by
        email, SMS, or WhatsApp. Because our &ldquo;delivery&rdquo; is a
        scheduled live session, there is no shipping or transit period.
      </p>

      <h2>4. If You Do Not Receive a Confirmation</h2>
      <p>
        If you complete a payment but do not receive a booking confirmation
        within a reasonable time, please check your spam folder and then contact
        us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or through
        our <Link href="/contact">Contact page</Link>. We will confirm your
        booking or, where a payment did not result in a confirmed session,
        resolve it in line with our{" "}
        <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
      </p>

      <h2>5. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. The current version will
        always be available on this page with an updated &ldquo;Last
        updated&rdquo; date.
      </p>
    </LegalLayout>
  );
}
