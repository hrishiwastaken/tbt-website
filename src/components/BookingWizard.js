"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONTACT_PHONE } from "@/lib/site";
import {
  PHONE_MAX_LENGTH,
  PHONE_PATTERN,
  PHONE_TITLE,
  sanitizePhone,
} from "@/lib/inputFormats";

// Service-first booking flow:
//   1. Service   → what kind of session
//   2. Consultant→ who (only those offering the chosen service)
//   3. Schedule  → the chosen consultant's real availability
//   4. Details   → client information
//   5. Confirm   → summary + how the fee is settled
//
// The client is charged the chosen consultant's own rate.

// Online payment is not live yet. The PhonePe gateway integration is fully
// built and kept intact server-side (createBooking still honours PAY_NOW,
// mints a checkout and holds the slot as AWAITING_PAYMENT) — it is simply
// not offered to clients from this wizard for now. Every booking is taken
// as PAY_LATER and the fee is settled with the clinic directly.
//
// To re-enable online payments: restore the PAY_NOW / PAY_LATER radio group
// on the Confirm step and let the user drive this value again. Nothing on
// the server needs to change.
const PAYMENT_OPTION = "PAY_LATER";

const STEPS = [
  { stepNum: 1, label: "Service" },
  { stepNum: 2, label: "Consultant" },
  { stepNum: 3, label: "Schedule" },
  { stepNum: 4, label: "Details" },
  { stepNum: 5, label: "Confirm" },
];

const rupees = (minor) => `₹${(minor / 100).toLocaleString("en-IN")}`;

export default function BookingWizard({ services = [], initialService = "" }) {
  const router = useRouter();

  const preselected = services.find((s) => s.slug === initialService) || null;

  const [step, setStep] = useState(preselected ? 2 : 1);
  const [selectedService, setSelectedService] = useState(preselected);

  const [consultants, setConsultants] = useState([]);
  const [loadingConsultants, setLoadingConsultants] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientDetails, setClientDetails] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    emergencyContact: "",
    gdprConsent: false,
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default the date to tomorrow, client-side only (deferred so the effect
  // body never sets state synchronously, and SSR renders an empty value —
  // avoiding a hydration mismatch on the date).
  useEffect(() => {
    const id = setTimeout(() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      setSelectedDate(
        `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(
          2,
          "0",
        )}-${String(t.getDate()).padStart(2, "0")}`,
      );
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Load the consultants who offer the selected service whenever it changes.
  // All state updates happen inside the async body (never synchronously in
  // the effect) so the effect stays render-safe.
  useEffect(() => {
    if (!selectedService) return;
    let cancelled = false;
    const load = async () => {
      setLoadingConsultants(true);
      setErrorMsg("");
      setConsultants([]);
      setSelectedConsultant(null);
      try {
        const res = await fetch(
          `/api/consultants?service=${encodeURIComponent(selectedService.slug)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setConsultants(data.consultants || []);
        else setErrorMsg(data.error || "Failed to load consultants.");
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setErrorMsg("Network error loading consultants.");
        }
      } finally {
        if (!cancelled) setLoadingConsultants(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedService]);

  // Load the chosen consultant's slots for the chosen date.
  useEffect(() => {
    if (!selectedConsultant || !selectedDate) return;
    let cancelled = false;
    const load = async () => {
      setLoadingSlots(true);
      setErrorMsg("");
      setSelectedSlot(null);
      try {
        const res = await fetch(
          `/api/bookings/available-slots?therapist=${selectedConsultant.slug}&date=${selectedDate}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setSlots(data.slots || []);
        else setErrorMsg(data.error || "Failed to load available slots.");
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setErrorMsg("Network error loading available slots.");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedConsultant, selectedDate]);

  const handleClientDetailChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Phone is filtered as it is typed rather than rejected on submit, so a
    // stray character never survives to the server (which re-validates it
    // with the same character classes — see server/validation.ts).
    const next =
      type === "checkbox"
        ? checked
        : name === "phone"
          ? sanitizePhone(value)
          : value;
    setClientDetails((prev) => ({ ...prev, [name]: next }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedService)
        return setErrorMsg("Please select a service to continue.");
    } else if (step === 2) {
      if (!selectedConsultant)
        return setErrorMsg("Please choose a consultant to continue.");
    } else if (step === 3) {
      if (!selectedDate || !selectedSlot)
        return setErrorMsg("Please select an available date and time slot.");
    } else if (step === 4) {
      const { name, email, phone, age, emergencyContact, gdprConsent } =
        clientDetails;
      if (!name || !email || !phone || !age || !emergencyContact)
        return setErrorMsg("Please fill out all client information fields.");
      if (!gdprConsent)
        return setErrorMsg(
          "You must consent to the Privacy Policy and IT Act terms.",
        );
    }
    setErrorMsg("");
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    // If the service was preselected from a service page, step 1 is skipped.
    const floor = preselected ? 2 : 1;
    setStep((s) => Math.max(floor, s - 1));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistSlug: selectedConsultant.slug,
          serviceSlug: selectedService.slug,
          date: selectedDate,
          time: selectedSlot.startTime,
          ...clientDetails,
          paymentOption: PAYMENT_OPTION,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsSubmitting(false);
        setErrorMsg(data.error || "Failed to create booking.");
        return;
      }
      const booking = data.booking;
      // Dormant gateway path, kept wired for when online payments go live:
      // PAY_NOW hands off to the gateway's secure checkout and confirmation
      // happens server-side (webhook / status poll), never in this client.
      // Unreachable while PAYMENT_OPTION is pinned to PAY_LATER.
      if (data.payment?.checkoutUrl) {
        window.location.assign(data.payment.checkoutUrl);
        return;
      }
      if (PAYMENT_OPTION === "PAY_NOW") {
        router.push(`/booking/payment-status?bookingId=${booking.id}`);
        return;
      }
      router.push(`/booking-confirmed?id=${booking.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to book session. Check your network connection.");
      setIsSubmitting(false);
    }
  };

  const fee = selectedConsultant?.feeMinor ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="font-cormorant text-5xl font-semibold text-charcoal mb-3">
          Reserve Your Space
        </h1>
        <p className="text-sage text-base">
          A deliberate step towards emotional clarity and grounded presence.
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-between mb-10 border-b border-mist/35 pb-6 text-xs tracking-wider uppercase text-sage">
        {STEPS.map((item) => (
          <div
            key={item.stepNum}
            className={`flex flex-col items-center gap-1 transition-all ${
              step >= item.stepNum
                ? "opacity-100 font-semibold text-forest"
                : "opacity-40"
            }`}
          >
            <span
              className={`h-8 w-8 rounded-full flex items-center justify-center border ${
                step >= item.stepNum
                  ? "border-forest bg-forest text-warm-white"
                  : "border-sage/40 text-sage"
              }`}
            >
              0{item.stepNum}
            </span>
            <span className="text-[10px] md:text-xs mt-1">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="glass-card p-8 md:p-12 rounded-2xl border border-mist/30 shadow-warm-soft relative">
        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-rose-50 border border-red-200 text-red-700 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-4 border-b border-mist/20 pb-2">
              Select a Service
            </h2>
            <p className="text-sage mb-6 text-sm">
              Choose the kind of session you&apos;re looking for. Next, you will
              pick the consultant who offers it.
            </p>

            {/* A service reached via /book?service=… is only preselected if it
                is actually bookable; say so rather than silently dropping the
                client back to an unexplained list. */}
            {initialService && !preselected && services.length > 0 && (
              <p className="text-terracotta text-sm italic bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                The service you came here for isn&apos;t open for booking right
                now. Please choose one of the sessions below.
              </p>
            )}

            {services.length === 0 ? (
              <p className="text-terracotta text-sm italic bg-red-50 p-4 rounded-xl border border-red-100 mb-8">
                No services are open for booking at the moment. Please check
                back soon, or contact us and we&apos;ll arrange a session for
                you.
              </p>
            ) : (
              <div className="space-y-4 mb-8">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all ${
                      selectedService?.id === service.id
                        ? "border-forest bg-warm-white shadow-sm ring-1 ring-forest/10"
                        : "border-mist/40 bg-warm-white/40 hover:border-sage"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-cormorant text-xl font-bold text-charcoal">
                          {service.name}
                        </h4>
                        <p className="text-sage text-xs leading-relaxed mt-1">
                          {service.description}
                        </p>
                      </div>
                      <span className="text-xs text-sage shrink-0 mt-1">
                        {service.durationMinutes} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-mist/20">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={services.length === 0}
                className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Consultant */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            {!preselected && (
              <button
                onClick={handlePrevStep}
                className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
              >
                ← Back to Services
              </button>
            )}
            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-2 border-b border-mist/20 pb-2">
              Choose Your Consultant
            </h2>
            <p className="text-sage mb-6 text-sm">
              These practitioners offer{" "}
              <span className="font-semibold text-forest">
                {selectedService?.name}
              </span>
              . Each sets their own session fee.
            </p>

            {loadingConsultants ? (
              <p className="text-sage text-sm italic py-8 text-center">
                Loading consultants…
              </p>
            ) : consultants.length === 0 ? (
              <p className="text-terracotta text-sm italic bg-red-50 p-4 rounded-xl border border-red-100">
                No consultants are currently available for this service. Please
                check back soon or contact us.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {consultants.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConsultant(c)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex gap-4 ${
                      selectedConsultant?.id === c.id
                        ? "border-forest bg-warm-white shadow-sm ring-1 ring-forest/10"
                        : "border-mist/40 bg-warm-white/40 hover:border-sage"
                    }`}
                  >
                    {c.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.photo}
                        alt={c.name}
                        className="h-16 w-16 rounded-full object-cover object-top shrink-0 border border-mist/30"
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-cormorant text-lg font-bold text-charcoal leading-tight">
                        {c.name}
                      </h4>
                      <p className="text-sage text-[11px] leading-relaxed mt-1 line-clamp-3">
                        {c.bio}
                      </p>
                      <span className="text-terracotta font-semibold text-sm mt-2 inline-block">
                        {rupees(c.feeMinor)}{" "}
                        <span className="text-sage font-normal text-xs">
                          / session
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-mist/20">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={consultants.length === 0}
                className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date and Slots */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
            >
              ← Back to Consultants
            </button>
            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-6 border-b border-mist/20 pb-2">
              Schedule with {selectedConsultant?.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
              <div className="md:col-span-5 flex flex-col gap-3">
                <label className="text-xs font-bold tracking-wider uppercase text-sage">
                  Select Appointment Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-warm-white/60 rounded-xl border border-mist/35 p-3.5 text-sm text-charcoal focus:ring-forest focus:border-forest"
                />
              </div>

              <div className="md:col-span-7 flex flex-col gap-3">
                <label className="text-xs font-bold tracking-wider uppercase text-sage">
                  Available Time Slots
                </label>
                {loadingSlots ? (
                  <p className="text-sage text-sm italic">
                    Loading available slots...
                  </p>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-lg border text-center text-xs transition-all ${
                          !slot.isAvailable
                            ? "bg-mist/10 text-sage/40 border-mist/10 cursor-not-allowed"
                            : selectedSlot?.id === slot.id
                              ? "border-forest bg-forest text-warm-white shadow-sm font-semibold"
                              : "border-mist/40 bg-warm-white/40 hover:border-sage text-charcoal"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-terracotta text-sm italic bg-red-50 p-4 rounded-xl border border-red-100">
                    No availability for {selectedConsultant?.name} on{" "}
                    {selectedDate}. Please select another date.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-mist/20">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
            >
              ← Back to Schedule
            </button>
            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-8 border-b border-mist/20 pb-2">
              Client Details
            </h2>

            <form className="space-y-6">
              <div>
                <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={clientDetails.name}
                  onChange={handleClientDetailChange}
                  placeholder="Jane Doe"
                  className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={clientDetails.email}
                    onChange={handleClientDetailChange}
                    placeholder="jane@example.com"
                    className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={PHONE_MAX_LENGTH}
                    pattern={PHONE_PATTERN}
                    title={PHONE_TITLE}
                    value={clientDetails.phone}
                    onChange={handleClientDetailChange}
                    placeholder="+91 98765 43210"
                    className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    inputMode="numeric"
                    min="1"
                    max="120"
                    value={clientDetails.age}
                    onChange={handleClientDetailChange}
                    placeholder="e.g. 32"
                    className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={clientDetails.emergencyContact}
                    onChange={handleClientDetailChange}
                    placeholder="John Doe (+919876543211)"
                    className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-start gap-4">
                <input
                  type="checkbox"
                  id="gdprConsent"
                  name="gdprConsent"
                  checked={clientDetails.gdprConsent}
                  onChange={handleClientDetailChange}
                  className="mt-1 h-5 w-5 text-forest border-mist/60 focus:ring-forest rounded"
                  required
                />
                <label
                  htmlFor="gdprConsent"
                  className="text-xs text-sage leading-relaxed select-none"
                >
                  I consent to the collection and secure storage of my contact
                  and health information in accordance with the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-forest underline underline-offset-2 hover:text-terracotta"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and India IT Act guidelines. I understand my records are
                  encrypted and accessible only to my therapist and clinical
                  admins.
                </label>
              </div>
            </form>

            <div className="flex justify-end pt-8 border-t border-mist/20 mt-8">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Summary & Payment */}
        {step === 5 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
            >
              ← Back to Details
            </button>
            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-6 border-b border-mist/20 pb-2">
              Confirm Booking
            </h2>

            <div className="bg-warm-white/50 p-6 rounded-xl border border-mist/20 flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center border-b border-mist/10 pb-3">
                <span className="text-xs font-bold uppercase text-sage">
                  Consultant
                </span>
                <span className="text-sm font-bold text-charcoal">
                  {selectedConsultant?.name}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-mist/10 pb-3">
                <span className="text-xs font-bold uppercase text-sage">
                  Service
                </span>
                <span className="text-sm font-bold text-charcoal">
                  {selectedService?.name}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-mist/10 pb-3">
                <span className="text-xs font-bold uppercase text-sage">
                  Date & Time
                </span>
                <span className="text-sm font-bold text-charcoal">
                  {selectedDate} at {selectedSlot?.startTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-forest">
                  Total Amount Due
                </span>
                <span className="text-2xl text-terracotta font-bold">
                  {rupees(fee)}
                </span>
              </div>
            </div>

            {/* Settling the fee — online payments are not live yet, so the
                desk takes it from here. */}
            <div className="mb-8 p-7 rounded-xl border border-mist/40 bg-warm-white/50">
              <h4 className="font-cormorant text-2xl font-semibold text-charcoal mb-2">
                Completing your booking
              </h4>
              <p className="text-sm text-sage leading-relaxed mb-5">
                To confirm this slot and settle the session fee, please contact
                our admin. We&apos;ll walk you through the rest personally.
              </p>

              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2.5 text-forest hover:text-terracotta transition-colors group"
              >
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage group-hover:text-terracotta transition-colors">
                  Contact our admin
                </span>
                <span className="font-cormorant text-2xl font-semibold tracking-wide">
                  {CONTACT_PHONE}
                </span>
              </a>

              <p className="mt-5 pt-4 border-t border-mist/25 text-xs text-sage leading-relaxed italic">
                Note: We will soon be available for online payments and
                bookings.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-mist/20">
              <span className="text-xs text-sage leading-relaxed max-w-sm">
                * Note: Sessions can be cancelled up to 48 hours, or rescheduled
                up to 24 hours, before slot start.
              </span>
              <button
                type="button"
                onClick={handleBookingSubmit}
                disabled={isSubmitting}
                className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-4 rounded-full transition-colors disabled:opacity-50 min-w-[200px] shadow-sm hover:shadow-md"
              >
                {isSubmitting ? "Processing..." : "Complete Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
