import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nosalgo",
  description: "A small public directory of educational YouTube resources.",
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
