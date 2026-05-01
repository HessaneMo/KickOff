import type { Metadata, Viewport } from "next";
import { Chakra_Petch } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KickOff — Organise ton tournoi en 5 minutes",
  description: "Plateforme de gestion de tournois de football amateur",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${chakraPetch.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider><ThemeProvider>{children}</ThemeProvider></AuthProvider>
      </body>
    </html>
  );
}
