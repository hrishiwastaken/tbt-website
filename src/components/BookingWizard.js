"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingWizard({
  therapists = [],
  services = [],
  initialService = "",
}) {
  const router = useRouter();

  // Wizard Steps: 1 (Service Selection), 2 (Schedule), 3 (Details), 4 (Confirm)
  const [step, setStep] = useState(1);

  // Pre-select the sole therapist: Dr. Madhumati Dhumak
  const [selectedTherapist] = useState(
    therapists[0] || { name: "Dr. Madhumati Dhumak", slug: "dr-madhumati-dhumak", fees: 200.0 }
  );

  const [selectedService, setSelectedService] = useState(
    services.find((s) => s.slug === initialService) || null
  );
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Client details
  const [clientDetails, setClientDetails] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    emergencyContact: "",
    gdprConsent: false,
  });

  const [paymentOption, setPaymentOption] = useState("PAY_NOW"); // PAY_NOW, PAY_LATER
  const [upiUtr, setUpiUtr] = useState("");

  // API loading & slot states
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default tomorrow's date for ease of scheduling on mount
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch available slots from backend whenever date changes
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
      if (!selectedService) {
        setErrorMsg("Please select a therapeutic service to continue.");
        return;
      }
      setErrorMsg("");
      setStep(2);
    } else if (step === 2) {
      if (!selectedDate || !selectedSlot) {
        setErrorMsg("Please select an available date and time slot.");
        return;
      }
      setErrorMsg("");
      setStep(3);
    } else if (step === 3) {
      const { name, email, phone, dob, emergencyContact, gdprConsent } = clientDetails;
      if (!name || !email || !phone || !dob || !emergencyContact) {
        setErrorMsg("Please fill out all client information fields.");
        return;
      }
      if (!gdprConsent) {
        setErrorMsg("You must consent to the Privacy Policy and IT Acts terms.");
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

    if (paymentOption === "PAY_NOW") {
      if (!upiUtr || upiUtr.length !== 12) {
        setErrorMsg("Please enter a valid 12-digit UPI Reference / UTR Number.");
        return;
      }
    }

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
          upiUtr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        setErrorMsg(data.error || "Failed to create booking.");
        return;
      }

      const booking = data.booking;
      router.push(`/booking-confirmed?id=${booking.id}`);
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
        <h1 className="font-cormorant text-5xl font-semibold text-charcoal mb-3">Reserve Your Space</h1>
        <p className="text-sage text-base">A deliberate step towards emotional clarity and grounded presence.</p>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-between mb-10 border-b border-mist/35 pb-6 text-xs tracking-wider uppercase text-sage">
        {[
          { stepNum: 1, label: "Services" },
          { stepNum: 2, label: "Schedule" },
          { stepNum: 3, label: "Details" },
          { stepNum: 4, label: "Confirm" },
        ].map((item) => (
          <div
            key={item.stepNum}
            className={`flex flex-col items-center gap-1 transition-all ${
              step >= item.stepNum ? "opacity-100 font-semibold text-forest" : "opacity-40"
            }`}
          >
            <span className={`h-8 w-8 rounded-full flex items-center justify-center border ${
              step >= item.stepNum ? "border-forest bg-forest text-warm-white" : "border-sage/40 text-sage"
            }`}>
              0{item.stepNum}
            </span>
            <span className="text-[10px] md:text-xs mt-1">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Booking Form Container */}
      <div className="glass-card p-8 md:p-12 rounded-2xl border border-mist/30 shadow-warm-soft relative">
        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-rose-50 border border-red-200 text-red-700 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-4 border-b border-mist/20 pb-2">Select a Service</h2>
            <p className="text-sage mb-6 text-sm">Select from our range of therapeutic and mental wellness practices with Dr. Madhumati Dhumak.</p>
            
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
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-cormorant text-xl font-bold text-charcoal">{service.name}</h4>
                      <p className="text-sage text-xs leading-relaxed mt-1 pr-6">{service.description}</p>
                    </div>
                    <span className="text-terracotta font-semibold text-lg shrink-0">
                      ₹{(service.price * 80).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-mist/10 text-xs text-sage">
                    <span>Duration: {service.durationMinutes} Min</span>
                    <span className="text-forest font-medium">Dr. Madhumati Dhumak</span>
                  </div>
                </div>
              ))}
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

        {/* Step 2: Date and Slots */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
            >
              ← Back to Services
            </button>

            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-6 border-b border-mist/20 pb-2">Schedule Session</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
              {/* Date selection */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <label className="text-xs font-bold tracking-wider uppercase text-sage">Select Appointment Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-warm-white/60 rounded-xl border border-mist/35 p-3.5 text-sm text-charcoal focus:ring-forest focus:border-forest"
                />
              </div>

              {/* Slots selection */}
              <div className="md:col-span-7 flex flex-col gap-3">
                <label className="text-xs font-bold tracking-wider uppercase text-sage">Available Time Slots</label>
                {loadingSlots ? (
                  <p className="text-sage text-sm italic">Loading available slots...</p>
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
                    No availability listed for Dr. Madhumati Dhumak on {selectedDate}. Please select another date.
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

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
            >
              ← Back to Schedule
            </button>

            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-8 border-b border-mist/20 pb-2">Client Details</h2>
            
            <form className="space-y-6">
              <div>
                <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">Full Name</label>
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
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">Email Address</label>
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
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={clientDetails.phone}
                    onChange={handleClientDetailChange}
                    placeholder="+919876543210"
                    className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={clientDetails.dob}
                    onChange={handleClientDetailChange}
                    className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-sage py-2 px-0 transition-colors text-base"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">Emergency Contact</label>
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

              {/* GDPR/Compliance Consent */}
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
                <label htmlFor="gdprConsent" className="text-xs text-sage leading-relaxed select-none">
                  I consent to the collection and secure storage of my contact and health information in accordance with the <strong>Privacy Policy</strong> and India IT Act guidelines. I understand my records are encrypted and accessible only to my therapist and clinical admins.
                </label>
              </div>
            </form>

            <div className="flex justify-end pt-8 border-t border-mist/20 mt-8">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Payment */}
        {step === 4 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <button
              onClick={handlePrevStep}
              className="mb-6 flex items-center gap-2 text-sage hover:text-charcoal transition-colors text-xs font-semibold"
            >
              ← Back to Details
            </button>

            <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-6 border-b border-mist/20 pb-2">Confirm Booking</h2>

            {/* Summary */}
            <div className="bg-warm-white/50 p-6 rounded-xl border border-mist/20 flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center border-b border-mist/10 pb-3">
                <span className="text-xs font-bold uppercase text-sage">Therapist</span>
                <span className="text-sm font-bold text-charcoal">{selectedTherapist.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-mist/10 pb-3">
                <span className="text-xs font-bold uppercase text-sage">Therapeutic Service</span>
                <span className="text-sm font-bold text-charcoal">{selectedService.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-mist/10 pb-3">
                <span className="text-xs font-bold uppercase text-sage">Appointment Date & Time</span>
                <span className="text-sm font-bold text-charcoal">
                  {selectedDate} at {selectedSlot.startTime} ({selectedService.durationMinutes} Min)
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold uppercase text-forest font-bold">Total Amount Due</span>
                <span className="text-2xl text-terracotta font-bold">
                  ₹{(selectedService.price * 80).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Payment options */}
            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-4 p-6 border rounded-xl cursor-pointer transition-colors bg-warm-white/40 border-mist/40 hover:border-forest">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentOption === "PAY_NOW"}
                  onChange={() => {
                    setPaymentOption("PAY_NOW");
                    setUpiUtr("");
                  }}
                  className="mt-1 text-forest focus:ring-forest"
                />
                <div>
                  <h4 className="text-sm font-bold text-charcoal">Pay Online via UPI Now</h4>
                  <p className="text-xs text-sage mt-1">
                    Scan the secure UPI QR Code using GPay, PhonePe, Paytm or any UPI app to pay immediately.
                  </p>
                </div>
              </label>

              {paymentOption === "PAY_NOW" && (
                <div className="p-6 bg-mist/10 rounded-xl border border-mist/30 flex flex-col items-center gap-6 animate-[fadeIn_0.3s_ease-out]">
                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-sage block mb-1">Scan to Pay via UPI</span>
                    <span className="font-dmsans text-xs text-sage">Scan QR using GPay, PhonePe, BHIM, or Paytm</span>
                  </div>
                  
                  {/* QR Image */}
                  <div className="bg-white p-4 rounded-xl border border-mist/20 shadow-sm relative w-[212px] h-[212px] flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=millionairemanthan@fam&pn=Solis Psychology&am=${selectedService.price * 80}&cu=INR&tn=Solis Session`
                      )}`}
                      alt="UPI QR Code"
                      className="w-[180px] h-[180px]"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <div className="text-xs text-charcoal">
                      Amount: <strong className="text-terracotta">₹{(selectedService.price * 80).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="text-[11px] text-sage font-mono">
                      UPI ID: <strong className="text-forest">millionairemanthan@fam</strong>
                    </div>
                  </div>

                  {/* Transaction UTR ID Input */}
                  <div className="w-full max-w-sm space-y-2 border-t border-mist/20 pt-4">
                    <label className="text-[10px] font-bold tracking-wider uppercase text-sage block">
                      Enter 12-Digit UPI Ref. No. / UTR *
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={upiUtr}
                      onChange={(e) => setUpiUtr(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456789012"
                      className="w-full text-center px-4 py-3 bg-white rounded-lg border border-mist/40 font-mono text-xs text-charcoal focus:outline-none focus:border-forest"
                      required
                    />
                    <span className="text-[9px] text-sage block leading-relaxed text-center">
                      * You will find the 12-digit UTR/Ref number in your payment transaction details screen on your UPI App.
                    </span>
                  </div>
                </div>
              )}
              
              <label className="flex items-start gap-4 p-6 border rounded-xl cursor-pointer transition-colors bg-warm-white/40 border-mist/40 hover:border-forest">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentOption === "PAY_LATER"}
                  onChange={() => {
                    setPaymentOption("PAY_LATER");
                    setUpiUtr("");
                  }}
                  className="mt-1 text-forest focus:ring-forest"
                />
                <div>
                  <h4 className="text-sm font-bold text-charcoal">Pay Post-Session</h4>
                  <p className="text-xs text-sage mt-1">
                    Hold booking with verification. Session fee is paid after completion at the clinic or via UPI link.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-mist/20">
              <span className="text-xs text-sage leading-relaxed max-w-sm">
                * Note: Sessions can be rescheduled or cancelled up to 12 hours before slot start.
              </span>
              <button
                type="button"
                onClick={handleBookingSubmit}
                disabled={isSubmitting || (paymentOption === "PAY_NOW" && upiUtr.length !== 12)}
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
