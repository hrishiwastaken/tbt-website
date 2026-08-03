/** @type {import('next').NextConfig} */

// Baseline security headers applied to every response. These are
// deliberately conservative so they harden the app (clickjacking, MIME
// sniffing, referrer leakage, feature abuse) without breaking Next.js
// hydration or the same-origin phone-preview iframe:
//   - frame-ancestors / X-Frame-Options are SAMEORIGIN, not DENY, because
//     PhonePreview renders the site inside its own same-origin <iframe>.
//   - The CSP intentionally omits script-src/default-src: a strict script
//     policy needs per-request nonces to survive Next's inline bootstrap,
//     which is a larger change. The directives set here (frame-ancestors,
//     base-uri, object-src, form-action) constrain the highest-risk vectors
//     while leaving script/style/image loading untouched.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Routes addressed by booking id alone. There are no client accounts, so the
// unguessable UUID in the URL is the only thing standing between a visitor
// and one customer's booking record — which makes the URL itself sensitive.
//
// Two leaks are closed here that the page-level robots metadata cannot:
//   - X-Robots-Tag covers API JSON responses too (no HTML head to put a
//     <meta> tag in), and applies even when a crawler never parses the body.
//   - no-store keeps booking data out of shared caches and CDN edges, which
//     otherwise happily retain an authenticated-looking-but-anonymous 200.
const privateBookingHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/booking-confirmed",
        headers: privateBookingHeaders,
      },
      {
        source: "/booking/payment-status",
        headers: privateBookingHeaders,
      },
      {
        source: "/api/bookings/:path*",
        headers: privateBookingHeaders,
      },
    ];
  },
};

export default nextConfig;
