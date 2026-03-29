import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fortschritt",
  description: "Lesefortschritt und Statistik nach markierten Kapiteln.",
};

export default function FortschrittLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
