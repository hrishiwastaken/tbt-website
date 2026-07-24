export const SITE_NAME = "The Brain Tea";
export const SITE_TAGLINE = "A space to unwind and heal";

/**
 * Legal / merchant identity. Used across the policy pages that payment
 * aggregators (PhonePe) require to be published and linked before a gateway
 * can be activated. Keep the legal name and contact block in sync with the
 * details registered on the PhonePe merchant dashboard.
 */
export const SITE_LEGAL_NAME = "The Brain Tea Mental Health Clinic";
export const SITE_URL = "https://www.thebraintea.com";
/** Effective / last-updated date shown on the legal pages. */
export const LEGAL_EFFECTIVE_DATE = "24 July 2026";

export const WHATSAPP_NUMBER = "919309833817";
export const WHATSAPP_MESSAGE =
  "Hello! I'd like to book an appointment at The Brain Tea. Could you please let me know your availability?";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

export const CONTACT_PHONE = "+91 93098 33817";
export const CONTACT_EMAIL = "contact@thebraintea.com";
export const CONTACT_ADDRESS = {
  line1: "Flat No. 8, 5th Floor, Abhimanshree Society,",
  line2: "Baner-Pashan Link Road, above ICICI Direct, Pune - 411008",
  landmark: "Near Ramnagar Metro Station",
};
export const CONTACT_HOURS = {
  weekday: "Mon – Fri: 9:00 AM – 7:00 PM",
  weekend: "Saturday: 10:00 AM – 4:00 PM",
};

export const MAIN_NAV = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Internship", href: "/internship" },
  { name: "FAQ", href: "/faq" },
] as const;
