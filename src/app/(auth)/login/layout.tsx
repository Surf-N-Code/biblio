import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Anmelden oder registrieren für KI-Funktionen und Lesefortschritt.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
