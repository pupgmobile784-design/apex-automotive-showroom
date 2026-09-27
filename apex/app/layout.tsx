import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX — Interactive Automotive Experience",
  description:
    "An immersive interactive 3D automotive showroom built with Next.js and Three.js.",
  openGraph: {
    title: "APEX — Interactive Automotive Experience",
    description:
      "An immersive interactive 3D automotive showroom built with Next.js and Three.js.",
    type: "website",
    siteName: "APEX",
  },
  twitter: {
    card: "summary_large_image",
    title: "APEX — Interactive Automotive Experience",
    description:
      "An immersive interactive 3D automotive showroom built with Next.js and Three.js.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
