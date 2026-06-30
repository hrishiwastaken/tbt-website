"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import Link from "next/link";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div 
      className={`glass-card rounded-2xl px-6 md:px-8 mb-4 border transition-all duration-300 relative overflow-hidden ${
        isOpen ? "border-forest/30 shadow-md bg-warm-white" : "border-mist/20 shadow-sm hover:border-forest/20 bg-warm-white/70"
      }`}
    >
      {/* Dynamic Left Vertical Border Accent */}
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: isOpen ? "100%" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute left-0 top-0 w-1.5 bg-terracotta"
      />

      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center text-left py-5 focus:outline-none group relative z-10"
      >
        <span className={`font-cormorant text-xl md:text-2xl font-semibold transition-colors pr-6 ${
          isOpen ? "text-forest" : "text-charcoal group-hover:text-forest"
        }`}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`${isOpen ? "text-forest" : "text-sage group-hover:text-forest"} shrink-0`}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: "easeOut" },
                opacity: { duration: 0.25, delay: 0.05 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: "easeIn" },
                opacity: { duration: 0.15 }
              }
            }}
            className="overflow-hidden"
          >
            <div className="font-dmsans text-sm md:text-base text-sage leading-relaxed pb-6 pr-6 text-pretty">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Is everything I share kept confidential?",
      answer: "Yes, absolute confidentiality is the cornerstone of our therapeutic practice. Everything you discuss in our sessions is strictly confidential. Information is only shared with your explicit written consent, except in rare circumstances mandated by law (such as immediate threat of serious harm to yourself or others)."
    },
    {
      question: "How do I know if therapy is right for me?",
      answer: "Therapy is beneficial for anyone experiencing emotional distress, navigating complex life transitions, struggling in relationships, or simply wanting to understand themselves better. You do not need to be in a crisis to seek therapy. If you feel stuck, overwhelmed, or want to make positive adjustments in your life, therapy can provide a structured, supportive space to do so."
    },
    {
      question: "What happens in the first session?",
      answer: "The first session, often called an intake or initial evaluation, is a collaborative conversation. It is a space for us to get to know each other, discuss what brings you to therapy, explore your history, and discuss your goals. It is also an opportunity for you to ask questions and see if you feel comfortable working with your assigned therapist."
    },
    {
      question: "How often will I need to come?",
      answer: "Generally, therapy is most effective when attended weekly, especially in the initial stages. This frequency helps establish a trust relationship and maintain therapeutic momentum. Over time, as you build tools and progress toward your goals, we may transition to bi-weekly sessions or occasional check-ins."
    },
    {
      question: "Do you offer online sessions?",
      answer: "Yes, we offer online video consultations for clients who prefer the comfort and convenience of therapy from home. Online sessions are conducted via a secure, HIPAA-compliant telehealth platform that ensures complete privacy. All you need is a stable internet connection and a quiet, private space."
    },
    {
      question: "What is the cost per session?",
      answer: "Our standard individual therapy sessions are ₹3,000 for 50 minutes. Couples and family sessions are ₹4,500 for 60 to 75 minutes. We believe that mental health care should be accessible, so we reserve a limited number of sliding-scale slots based on financial hardship and student status."
    },
    {
      question: "How do I cancel or reschedule?",
      answer: "We have a standard 24-hour cancellation policy. If you need to cancel or reschedule your session, please notify us at least 24 hours in advance. Sessions cancelled with less than 24 hours' notice will be charged at the full session rate, as that hour was reserved specifically for you."
    },
    {
      question: "Do you work with children?",
      answer: "Yes, we have specialists who work with children and adolescents (ages 6-18). Our approach combines age-appropriate talk therapy with play-integrated interventions and creative activities, helping younger clients process transitions, emotional changes, and school or family stressors."
    },
    {
      question: "What therapeutic approaches do you use?",
      answer: "Our practitioners are trained in a variety of evidence-based modalities, including Cognitive Behavioral Therapy (CBT), Acceptance and Commitment Therapy (ACT), psychodynamic therapy, and trauma-informed systems. We do not use a one-size-fits-all approach; we tailor our methods to your specific goals and personality."
    },
    {
      question: "How long does therapy typically last?",
      answer: "The duration of therapy is highly individual. Some clients find that short-term, solution-focused therapy (8 to 12 sessions) is sufficient to address a specific issue. Others choose to engage in long-term therapy for deeper self-exploration and character work. We will regularly check in to review your goals and determine what is best for you."
    }
  ];

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      
      {/* PAGE HERO */}
      <section className="bg-sand pt-32 pb-20 border-b border-mist/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase mb-4 block">
            Got Questions?
          </span>
          <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-charcoal leading-tight mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-sage text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            No question is too small. We are here to clarify any doubts you have about starting your mental health journey.
          </p>
        </div>
      </section>

      {/* ACCORDION FAQ SECTION */}
      <section className="py-24 max-w-4xl mx-auto px-6">
        <div className="flex flex-col">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-16 text-center bg-sand border-t border-mist/20">
        <div className="max-w-2xl mx-auto px-6">
          <HelpCircle className="w-12 h-12 text-terracotta mx-auto mb-4" />
          <h2 className="font-cormorant text-3xl font-semibold text-charcoal mb-4">
            Still Have Questions?
          </h2>
          <p className="text-sm text-sage mb-8 max-w-md mx-auto">
            If you have any other concerns, feel free to drop us a line or connect via WhatsApp. We are happy to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="bg-forest hover:bg-sage text-warm-white font-medium px-8 py-3 rounded-full text-sm transition-all"
            >
              Contact Us Form
            </Link>
            <a
              href="https://wa.me/919876543210?text=Hi!%20I%20have%20a%20few%20questions%20about%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="border border-forest text-forest hover:bg-forest/5 font-medium px-8 py-3 rounded-full text-sm transition-all"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
