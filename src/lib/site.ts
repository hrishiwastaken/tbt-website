export const SITE_NAME = "The Brain Tea";
export const SITE_TAGLINE = "A space to unwind and heal";

/**
 * Legal / merchant identity. Used across the policy pages that payment
 * aggregators (PhonePe) require to be published and linked before a gateway
 * can be activated. Keep the legal name and contact block in sync with the
 * details registered on the PhonePe merchant dashboard.
 */
export const SITE_LEGAL_NAME = "The Brain Tea Mental Health Clinic";
export const SITE_URL = "https://www.thebraintea.co.in";
/** Effective / last-updated date shown on the legal pages. */
export const LEGAL_EFFECTIVE_DATE = "24 July 2026";

/**
 * Route prefixes that render a signed-in dashboard rather than the public
 * site. The shared public chrome (header, footer, WhatsApp button, phone
 * preview) hides itself on these — kept in one place so adding a panel
 * can't leave the marketing header bleeding into it.
 */
export const DASHBOARD_PREFIXES = [
  "/admin",
  "/reception",
  "/therapist",
  "/portal",
] as const;

export function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const INSTAGRAM_URL = "https://www.instagram.com/thebraintea.community";

export const WHATSAPP_NUMBER = "919309833817";
export const WHATSAPP_MESSAGE =
  "Hello! I'd like to book an appointment at The Brain Tea. Could you please let me know your availability?";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

export const CONTACT_PHONE = "+91 93098 33817";
export const CONTACT_EMAIL = "admin@thebraintea.co.in";
export const CONTACT_MAP_URL = "https://maps.app.goo.gl/HCiZkhywCh6Hshsr8";
export const CONTACT_ADDRESS = {
  line1: "Flat No. 8, 5th Floor, Abhimanshree Society,",
  line2: "Baner-Pashan Link Road, above ICICI Direct, Pune - 411008",
  landmark: "Near Sakal Nagar Metro station",
};
export const CONTACT_HOURS = {
  weekday: "Monday – Saturday: 9:00 AM – 8:00 PM",
  weekend: "Sunday: 10:00 AM – 4:00 PM",
};

/**
 * Published cancellation / rescheduling windows, in hours before the session
 * starts. These are the numbers quoted on the FAQ, the Terms, the Refund &
 * Cancellation policy, the booking wizard and the confirmation screen — the
 * server-side guards import them from here so enforcement can never drift
 * away from what the client was told.
 */
export const CANCELLATION_NOTICE_HOURS = 48;
export const RESCHEDULE_NOTICE_HOURS = 24;

export const MAIN_NAV = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Internship", href: "/internship" },
  { name: "FAQ", href: "/faq" },
] as const;
