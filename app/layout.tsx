import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The BONER Boardroom | Morning Wood Report",
  description: "An extraordinarily unserious shareholder meeting powered by real Nansen cohort flows. Featuring the Morning Wood Report.",
  icons: {
    icon: "/boner-logo.png",
    shortcut: "/boner-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
