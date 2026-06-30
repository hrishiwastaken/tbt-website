"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingWizard({
  therapists,
  services,
  initialTherapist,
  initialService,
}) {
  const router = useRouter();

  // Wizard Steps: 1 (Service & Therapist), 2 (Schedule), 3 (Details), 4 (Confirm)
  const [step, setStep] = useState(1);

  // Form selections
  const [selectedTherapist, setSelectedTherapist] = useState(
    therapists.find((t) => t.slug === initialTherapist) || null
  );
  const [selectedService, setSelectedService] = useState(
    services.find((s) => s.slug === initialService) || null
  );
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Client profiles
  const [clientDetails, setClientDetails] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    emergencyContact: "",
    gdprConsent: false,
  });

  const [paymentOption, setPaymentOption] = useState("PAY_NOW"); // PAY_NOW, PAY_LATER

  // API Slot loading states
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Razorpay Script on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    
    // Default tomorrow's date for ease of scheduling
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch available slots from backend whenever therapist or date changes
  useEffect(() => {
    if (selectedTherapist && selectedDate) {
      fetchSlots();
    }
  }, [selectedTherapist, selectedDate]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setErrorMsg("");
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/bookings/available-slots?therapist=${selectedTherapist.slug}&date=${selectedDate}`
      );
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      } else {
        setErrorMsg(data.error || "Failed to load available slots.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading available slots.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleClientDetailChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientDetails({
      ...clientDetails,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedTherapist || !selectedService) {
        setErrorMsg("Please select both a therapist and a service.");
        return;
      }
      setErrorMsg("");
      setStep(2);
    } else if (step === 2) {
      if (!selectedDate || !selectedSlot) {
        setErrorMsg("Please select a date and an available time slot.");
        return;
      }
      setErrorMsg("");
      setStep(3);
    } else if (step === 3) {
      const { name, email, phone, dob, emergencyContact, gdprConsent } = clientDetails;
      if (!name || !email || !phone || !dob || !emergencyContact) {
        setErrorMsg("Please fill out all client details.");
        return;
      }
      if (!gdprConsent) {
        setErrorMsg("You must consent to the Privacy Policy and GDPR/IT terms to proceed.");
        return;
      }
      setErrorMsg("");
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    setStep((prev) => Math.max(1, prev - 1));
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
          therapistSlug: selectedTherapist.slug,
          serviceSlug: selectedService.slug,
          date: selectedDate,
          time: selectedSlot.startTime,
          ...clientDetails,
          paymentOption,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        setErrorMsg(data.error || "Failed to create booking.");
        return;
      }

      const booking = data.booking;

      if (paymentOption === "PAY_NOW" && data.razorpayOrder) {
        const order = data.razorpayOrder;
        
        // Check if Razorpay keys are mock configurations
        const isMockMode = order.id.startsWith("order_mock_");

        if (isMockMode) {
          // Development simulated payment flow
          setTimeout(async () => {
            try {
              const verifyRes = await fetch("/api/bookings/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bookingId: booking.id,
                  razorpay_order_id: order.id,
                  razorpay_payment_id: `pay_mock_${booking.id.slice(0, 8)}`,
                  razorpay_signature: "mock_signature_approved",
                  isMock: true,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) {
                router.push(`/booking-confirmed?id=${booking.id}`);
              } else {
                setErrorMsg(verifyData.error || "Signature verification failed.");
                setIsSubmitting(false);
              }
            } catch (err) {
              console.error(err);
              setErrorMsg("Payment verification error.");
              setIsSubmitting(false);
            }
          }, 1500);
        } else {
          // Standard production Razorpay Modal triggers
          const options = {
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: "Madhumati Clinic",
            description: `${selectedService.name} with ${selectedTherapist.name}`,
            order_id: order.id,
            handler: async function (response) {
              try {
                const verifyRes = await fetch("/api/bookings/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookingId: booking.id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                if (verifyRes.ok) {
                  router.push(`/booking-confirmed?id=${booking.id}`);
                } else {
                  const errData = await verifyRes.json();
                  setErrorMsg(errData.error || "Payment verification failed.");
                  setIsSubmitting(false);
                }
              } catch (verifyErr) {
                console.error(verifyErr);
                setErrorMsg("An error occurred verifying your transaction.");
                setIsSubmitting(false);
              }
            },
            prefill: {
              name: data.client.name,
              email: data.client.email,
              contact: data.client.phone,
            },
            theme: {
              color: "#7E6363", // Rosewood CTA
            },
            modal: {
              ondismiss: function () {
                setErrorMsg("Payment cancelled by user.");
                setIsSubmitting(false);
              },
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      } else {
        // Direct redirect for Pay Later
        router.push(`/booking-confirmed?id=${booking.id}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to book session. Check your network connection.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-hero text-hero-mobile md:text-h1 text-on-surface mb-2">Reserve Your Space</h1>
        <p className="font-body text-body text-taupe-body">Take a structured, clinical step towards emotional alignment.</p>
      </div>

      {/* Progress Indicators (Design System Layout) */}
      <div className="flex justify-between mb-10 border-b border-surface-variant/30 pb-6 font-label text-label uppercase tracking-widest text-caption">
        {[
          { stepNum: 1, label: "Services" },
          { stepNum: 2, label: "Schedule" },
          { stepNum: 3, label: "Details" },
          { stepNum: 4, label: "Confirm" },
        ].map((item) => (
          <div
            key={item.stepNum}
            className={`flex flex-col items-center gap-1 transition-all ${
              step >= item.stepNum ? "opacity-100 font-semibold" : "opacity-40"
            }`}
          >
            <span className={`h-8 w-8 rounded-full flex items-center justify-center border ${
              step >= item.stepNum ? "border-rosewood-cta bg-rosewood-cta text-white" : "border-outline text-taupe-body"
            }`}>
              0{item.stepNum}
            </span>
            <span className="text-[10px] md:text-label mt-1">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Booking Form Container */}
      <div className="bg-linen-surface/80 rounded-[20px] p-8 md:p-12 border border-surface-variant/40 relative shadow-sm">
        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-[#ffdad6] text-[#ba1a1a] font-body text-caption font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Select Therapist & Service */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="font-hero text-h2 text-on-surface mb-8 border-b border-surface-variant/30 pb-2">Select Therapist & Service</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Select Therapist */}
              <div>
                <label className="font-label text-label text-taupe-body uppercase tracking-wider block mb-3">Therapist</label>
                <div className="space-y-4">
                  {therapists.map((therapist) => (
                    <div
                      key={therapist.id}
                      onClick={() => setSelectedTherapist(therapist)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedTherapist?.id === therapist.id
                          ? "border-rosewood-cta bg-alabaster-bg shadow-sm"
                          : "border-surface-variant bg-transparent hover:border-outline"
                      }`}
                    >
                      <h4 className="font-body text-body font-bold text-on-surface">{therapist.name}</h4>
                      <p className="font-body text-caption text-taupe-body line-clamp-2 mt-1">{therapist.bio}</p>
                      <span className="font-label text-label text-rosewood-cta block mt-2">
                        ₹{(therapist.fees * 80).toLocaleString("en-IN")} / hr
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Service */}
              <div>
                <label className="font-label text-label text-taupe-body uppercase tracking-wider block mb-3">Therapeutic Service</label>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedService?.id === service.id
                          ? "border-rosewood-cta bg-alabaster-bg shadow-sm"
                          : "border-surface-variant bg-transparent hover:border-outline"
                      }`}
                    >
                      <h4 className="font-body text-body font-bold text-on-surface">{service.name}</h4>
                      <p className="font-body text-caption text-taupe-body line-clamp-2 mt-1">{service.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-label text-label text-taupe-body">{service.durationMinutes} Min</span>
                        <span className="font-label text-label text-on-surface font-semibold">
                          ₹{(service.price * 80).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-rosewood-cta text-on-primary font-body text-body px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date and Availability slots */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-taupe-body hover:text-on-surface transition-colors font-body text-caption"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Step 1
            </button>

            <h2 className="font-hero text-h2 text-on-surface mb-6 border-b border-surface-variant/30 pb-2">Schedule Session</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
              {/* Date Input Column */}
              <div className="md:col-span-5 flex flex-col gap-4">
                <label className="font-label text-label text-taupe-body uppercase tracking-wider block">Select Appointment Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-alabaster-bg rounded-lg border border-surface-variant p-4 font-body text-body text-on-surface focus:ring-rosewood-cta focus:border-rosewood-cta"
                />
              </div>

              {/* Time Slots Column */}
              <div className="md:col-span-7 flex flex-col gap-4">
                <label className="font-label text-label text-taupe-body uppercase tracking-wider block">Available Time Slots</label>
                {loadingSlots ? (
                  <p className="font-body text-body text-taupe-body italic">Loading availability slots...</p>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-lg border text-center text-caption font-body transition-all ${
                          !slot.isAvailable
                            ? "bg-surface-container-low text-primary-fixed-dim border-surface-variant opacity-40 cursor-not-allowed"
                            : selectedSlot?.id === slot.id
                            ? "border-rosewood-cta bg-rosewood-cta text-white shadow-sm font-semibold"
                            : "border-surface-variant bg-alabaster-bg hover:border-outline text-on-surface"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-body text-[#ba1a1a] italic bg-[#ffdad6] p-4 rounded-lg">
                    No availability listed for this therapist on {selectedDate}. Please select another date.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-rosewood-cta text-on-primary font-body text-body px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Client Details */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-taupe-body hover:text-on-surface transition-colors font-body text-caption"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Step 2
            </button>

            <h2 className="font-hero text-h2 text-on-surface mb-8 border-b border-surface-variant/30 pb-2">Client Details</h2>
            
            <form className="space-y-8">
              <div>
                <label className="font-label text-label text-taupe-body uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={clientDetails.name}
                  onChange={handleClientDetailChange}
                  placeholder="Jane Doe"
                  className="form-input-minimal"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="font-label text-label text-taupe-body uppercase block mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={clientDetails.email}
                    onChange={handleClientDetailChange}
                    placeholder="jane@example.com"
                    className="form-input-minimal"
                    required
                  />
                </div>
                <div>
                  <label className="font-label text-label text-taupe-body uppercase block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={clientDetails.phone}
                    onChange={handleClientDetailChange}
                    placeholder="+919876543210"
                    className="form-input-minimal"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="font-label text-label text-taupe-body uppercase block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={clientDetails.dob}
                    onChange={handleClientDetailChange}
                    className="form-input-minimal text-taupe-body"
                    required
                  />
                </div>
                <div>
                  <label className="font-label text-label text-taupe-body uppercase block mb-1">Emergency Contact Details</label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={clientDetails.emergencyContact}
                    onChange={handleClientDetailChange}
                    placeholder="John Doe (+919876543211)"
                    className="form-input-minimal"
                    required
                  />
                </div>
              </div>

              {/* GDPR/Compliance Consent Checkbox */}
              <div className="pt-4 flex items-start gap-4">
                <input
                  type="checkbox"
                  id="gdprConsent"
                  name="gdprConsent"
                  checked={clientDetails.gdprConsent}
                  onChange={handleClientDetailChange}
                  className="mt-1 h-5 w-5 text-rosewood-cta border-surface-variant focus:ring-rosewood-cta rounded"
                  required
                />
                <label htmlFor="gdprConsent" className="font-body text-caption text-taupe-body leading-relaxed select-none">
                  I consent to the collection and secure storage of my contact and health information in accordance with the <strong>Privacy Policy</strong> and India IT Act guidelines. I understand my records are encrypted and accessible only to my therapist and clinical admins.
                </label>
              </div>
            </form>

            <div className="flex justify-end pt-8 border-t border-surface-variant/30 mt-8">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-rosewood-cta text-on-primary font-body text-body px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Booking Summary and Payment preference */}
        {step === 4 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-taupe-body hover:text-on-surface transition-colors font-body text-caption"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Step 3
            </button>

            <h2 className="font-hero text-h2 text-on-surface mb-6 border-b border-surface-variant/30 pb-2">Confirm Booking</h2>

            {/* Summary details */}
            <div className="bg-alabaster-bg p-6 rounded-xl border border-surface-variant/30 flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
                <span className="font-label text-label text-taupe-body uppercase">Therapist</span>
                <span className="font-body text-body font-bold text-on-surface">{selectedTherapist.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
                <span className="font-label text-label text-taupe-body uppercase">Therapeutic Service</span>
                <span className="font-body text-body font-bold text-on-surface">{selectedService.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
                <span className="font-label text-label text-taupe-body uppercase">Appointment Date & Time</span>
                <span className="font-body text-body font-bold text-on-surface">
                  {selectedDate} at {selectedSlot.startTime} ({selectedService.durationMinutes} Min)
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-label text-label text-taupe-body uppercase font-bold">Total Amount Due</span>
                <span className="font-h3 text-h3 text-rosewood-cta font-bold">
                  ₹{(selectedService.price * 80).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Payment choices */}
            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-4 p-6 border rounded-lg cursor-pointer transition-colors bg-alabaster-bg border-surface-variant hover:border-rosewood-cta">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentOption === "PAY_NOW"}
                  onChange={() => setPaymentOption("PAY_NOW")}
                  className="mt-1 text-rosewood-cta focus:ring-rosewood-cta"
                />
                <div>
                  <h4 className="font-body text-body font-bold text-on-surface">Pay Online Now</h4>
                  <p className="font-body text-caption text-taupe-body mt-1">
                    Securely pay using UPI, NetBanking, Cards, or Wallet. Automated confirmation receipt emailed immediately.
                  </p>
                </div>
              </label>
              
              <label className="flex items-start gap-4 p-6 border rounded-lg cursor-pointer transition-colors bg-alabaster-bg border-surface-variant hover:border-rosewood-cta">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentOption === "PAY_LATER"}
                  onChange={() => setPaymentOption("PAY_LATER")}
                  className="mt-1 text-rosewood-cta focus:ring-rosewood-cta"
                />
                <div>
                  <h4 className="font-body text-body font-bold text-on-surface">Pay Post-Session</h4>
                  <p className="font-body text-caption text-taupe-body mt-1">
                    Hold booking with verification. Session fee is paid after completion at the front desk or via UPI link.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-between pt-6 border-t border-surface-variant/30">
              <span className="font-body text-caption text-taupe-body self-center">
                * Note: Sessions can be rescheduled/cancelled up to 12 hours before slot start.
              </span>
              <button
                type="button"
                onClick={handleBookingSubmit}
                disabled={isSubmitting}
                className="bg-rosewood-cta text-on-primary font-body text-body px-8 py-4 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[200px]"
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
