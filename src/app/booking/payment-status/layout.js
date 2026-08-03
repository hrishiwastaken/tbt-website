// The status page itself is a client component and cannot export metadata,
// so the robots directive lives here. Same reasoning as /booking-confirmed:
// the booking id in the query string is the only credential, so the URL must
// never be indexed or archived.
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PaymentStatusLayout({ children }) {
  return children;
}
