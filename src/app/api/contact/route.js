import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rateLimit";

// Simple HTML/Script sanitization helper to prevent basic XSS
function sanitizeString(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

export async function POST(request) {
  try {
    // 1. Rate Limiting Check
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const { isBlocked, remaining } = rateLimiter(ip, 5, 60000); // 5 requests per minute

    if (isBlocked) {
      return NextResponse.json(
        { error: "Too many inquiries. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, subject, message } = body;

    // 2. Validate input existence
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // 3. Email format regex verification
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // 4. Sanitize strings to neutralize injection payloads
    const cleanName = sanitizeString(name);
    const cleanEmail = sanitizeString(email);
    const cleanSubject = sanitizeString(subject);
    const cleanMessage = sanitizeString(message);

    // Audit Log for diagnostic trace
    console.log(`[CONTACT INQUIRY RECEIVED]
Name: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}
Message: ${cleanMessage}
IP: ${ip}
`);

    // In a real environment, you would integrate Resend or SMTP Nodemailer here:
    // await resend.emails.send({ ... });

    return NextResponse.json(
      { message: "Inquiry successfully submitted." },
      {
        headers: {
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (error) {
    console.error("Contact API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
