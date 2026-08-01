import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseline",
  description: "Mobile-first co-parenting communication app scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
