import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magic Phrase Vault",
  description: "Map magic phrases to secrets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
