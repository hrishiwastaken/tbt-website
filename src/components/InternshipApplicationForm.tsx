"use client";

import React, { useState } from "react";
import { Input, Textarea } from "./ui/Input";
import Button from "./ui/Button";
import Surface from "./ui/Surface";

export default function InternshipApplicationForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Surface variant="raised" radius="surface" className="p-8 text-center">
        <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-2">
          Thanks for your interest!
        </h3>
        <p className="text-sm text-charcoal/80 leading-relaxed">
          This is a prototype of the application flow -- our real intake process isn&apos;t
          connected yet. Please reach out via the Contact page in the meantime.
        </p>
      </Surface>
    );
  }

  return (
    <Surface variant="raised" radius="surface" className="p-6 md:p-10">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Full Name" id="fullName" required />
          <Input label="Email" id="email" type="email" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Phone" id="phone" type="tel" required />
          <Input label="College / University" id="college" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Current Course" id="course" required />
          <Input label="Year / Semester" id="year" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="internshipType" className="text-xs font-bold tracking-wider uppercase text-charcoal/80 block mb-2">
              Internship Type *
            </label>
            <select
              id="internshipType"
              required
              className="floating-input"
              defaultValue=""
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="graduate">Graduate -- Administrative Focus</option>
              <option value="postgraduate">Postgraduate -- Clinical Focus</option>
            </select>
          </div>
          <Input label="Preferred Start Date" id="startDate" type="date" required />
        </div>
        <Textarea label="Statement of Purpose" id="sop" required rows={5} />
        <div>
          <label htmlFor="resume" className="text-xs font-bold tracking-wider uppercase text-charcoal/80 block mb-2">
            Resume Upload *
          </label>
          <input
            id="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            required
            className="w-full text-sm text-charcoal/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-teal-sage file:text-white file:text-xs file:font-semibold file:cursor-pointer cursor-pointer"
          />
        </div>
        <div className="pt-2">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Submit Application
          </Button>
        </div>
      </form>
    </Surface>
  );
}
