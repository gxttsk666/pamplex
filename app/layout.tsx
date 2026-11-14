import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pamplex",
    template: "%s | Pamplex",
  },
  description:
    "Plataforma brasileira moderna de comunicação, comunidades, voz e mensagens em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pamplex-bg text-pamplex-text-primary selection:bg-pamplex-turquesa/30 selection:text-pamplex-text-primary">
        {children}
      </body>
    </html>
  );
}