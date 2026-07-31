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
    ];
  },
};

export default nextConfig;
