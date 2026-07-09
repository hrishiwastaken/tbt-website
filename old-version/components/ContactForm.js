"use client";

import React, { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR
  const [messageText, setMessageText] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus("ERROR");
      setMessageText("Please fill out all fields.");
      return;
    }

    setStatus("SENDING");
    setMessageText("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("SUCCESS");
        setMessageText("Thank you. Your message has been sent successfully.");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("ERROR");
        setMessageText(data.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setStatus("ERROR");
      setMessageText("A network error occurred. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 glass-card p-8 md:p-12 rounded-2xl border border-mist/30 shadow-warm-soft">
      <h3 className="font-cormorant text-3xl font-semibold text-charcoal mb-4 border-b border-mist/20 pb-2">Send a Message</h3>
      
      {status === "SUCCESS" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {messageText}
        </div>
      )}

      {status === "ERROR" && (
        <div className="p-4 rounded-xl bg-rose-50 border border-red-200 text-red-700 text-sm font-medium">
          {messageText}
        </div>
      )}

      <div>
        <label htmlFor="name" className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Jane Doe"
          className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
          disabled={status === "SENDING"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label htmlFor="email" className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="jane@example.com"
            className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
            disabled={status === "SENDING"}
          />
        </div>
        <div>
          <label htmlFor="subject" className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder="Consultation Inquiry"
            className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
            disabled={status === "SENDING"}
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="text-xs font-bold tracking-wider uppercase text-sage block mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          required
          placeholder="Write your details or inquiry here..."
          className="w-full bg-warm-white/50 border-t-0 border-l-0 border-r-0 border-b border-mist/60 focus:ring-0 focus:border-forest text-charcoal py-2 px-0 transition-colors text-base"
          disabled={status === "SENDING"}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={status === "SENDING"}
          className="bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3 rounded-full transition-colors disabled:opacity-50 shadow-sm hover:shadow-md"
        >
          {status === "SENDING" ? "Sending..." : "Submit Inquiry"}
        </button>
      </div>
    </form>
  );
}
