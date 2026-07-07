import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import WhatsAppButton from "../components/WhatsAppButton";

export const metadata: Metadata = {
  title: "The Brain Tea | Psychology & Mental Wellness",
  description: "A calm, modern space for therapy, psychiatric support, and psychological growth. Compassionate, evidence-based care for individuals, couples, and families.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "The Brain Tea | Psychology & Mental Wellness",
    description: "A calm, modern space for therapy, psychiatric support, and psychological growth.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-ivory text-charcoal min-h-screen flex flex-col justify-between">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
