import { Tenor_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const tenorSans = Tenor_Sans({
  weight: "400",
  variable: "--font-tenor-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Madhumati Clinic - Quiet Luxury in Emotional Wellness",
  description: "A sanctuary for emotional wellness, providing evidence-based psychological practice, individual therapy, couples counseling, and clinical evaluations.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${tenorSans.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased light`}
    >
      <head>
        {/* Material Symbols Outlined Icon Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-linen-surface text-on-surface">
        {children}
      </body>
    </html>
  );
}
