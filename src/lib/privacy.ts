/**
 * Display-side masking for personal data.
 *
 * The client-facing booking pages are addressed by booking UUID alone —
 * there are no client accounts, so the unguessable id in the URL is the only
 * credential. That makes the URL itself the sensitive artifact: it survives
 * in browser history, bookmarks, chat previews, screenshots and any proxy
 * log that records query strings. Anyone who ends up holding a booking link
 * can open the confirmation page.
 *
 * We cannot authenticate that visitor, so we reduce what a leaked link is
 * worth: the confirmation screen shows enough for the real client to
 * recognise their own booking, and not enough to hand a stranger a usable
 * contact record.
 */

/**
 * `hrishi@gmail.com` → `hr••••@gmail.com`
 *
 * The domain stays intact and the first characters are kept so the booking
 * client can confirm the receipt went to the right inbox; the local part is
 * no longer transcribable by someone who merely has the link.
 */
export function maskEmail(email: string): string {
  if (typeof email !== "string") return "•••";
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "•••";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  // Local parts of one or two characters are masked whole: keeping a "head"
  // of a two-character address would disclose all or half of it, which is
  // the opposite of the point.
  const head = local.length > 2 ? local.slice(0, 2) : "";
  const hidden = "•".repeat(Math.max(3, local.length - head.length));

  return `${head}${hidden}@${domain}`;
}
