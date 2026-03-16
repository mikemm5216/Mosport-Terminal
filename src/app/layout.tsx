import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mosport | Sports Quant Intelligence",
  description: "Extract statistical signals from noisy sports data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-primary-text antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
