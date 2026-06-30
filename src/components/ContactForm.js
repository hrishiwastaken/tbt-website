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
    
    // Simple basic client-side check
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
    <form onSubmit={handleSubmit} className="space-y-8 bg-linen-surface p-8 md:p-12 rounded-[20px] border border-surface-variant/40 shadow-sm">
      <h3 className="font-hero text-h2 text-on-surface mb-6 border-b border-surface-variant pb-2">Send a Message</h3>
      
      {status === "SUCCESS" && (
        <div className="p-4 rounded bg-[#d6e7d7] text-[#111f15] font-body text-caption">
          {messageText}
        </div>
      )}

      {status === "ERROR" && (
        <div className="p-4 rounded bg-[#ffdad6] text-[#ba1a1a] font-body text-caption font-semibold">
          {messageText}
        </div>
      )}

      <div>
        <label htmlFor="name" className="font-label text-label text-taupe-body uppercase block mb-1">
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
          className="form-input-minimal"
          disabled={status === "SENDING"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label htmlFor="email" className="font-label text-label text-taupe-body uppercase block mb-1">
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
            className="form-input-minimal"
            disabled={status === "SENDING"}
          />
        </div>
        <div>
          <label htmlFor="subject" className="font-label text-label text-taupe-body uppercase block mb-1">
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
            className="form-input-minimal"
            disabled={status === "SENDING"}
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="font-label text-label text-taupe-body uppercase block mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows="4"
          value={formData.message}
          onChange={handleChange}
          required
          placeholder="Write your details or inquiry here..."
          className="form-input-minimal"
          disabled={status === "SENDING"}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={status === "SENDING"}
          className="bg-rosewood-cta text-on-primary hover:opacity-90 px-8 py-3 rounded-full font-body text-body transition-opacity disabled:opacity-50"
        >
          {status === "SENDING" ? "Sending..." : "Submit Inquiry"}
        </button>
      </div>
    </form>
  );
}
