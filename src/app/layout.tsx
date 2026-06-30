import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import WhatsAppButton from "../components/WhatsAppButton";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmsans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Solis Psychology & Mental Health Clinic | Dr. Madhumati Dhumak",
  description: "Compassionate, evidence-based therapy for individuals, couples, and families. A warm, human-centered space to begin your journey back to yourself.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Solis Psychology & Mental Health Clinic",
    description: "A warm and safe space to begin. Compassionate, evidence-based psychotherapy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmsans.variable}`}>
      <body className="bg-ivory text-charcoal min-h-screen flex flex-col justify-between">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
