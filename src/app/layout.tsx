import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Амралтын Газрын Захиалгын Систем",
  description: "Манай амралтын газарт тавтай морилно уу.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen" suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <Navbar />
              <main className="min-h-screen bg-[var(--background)]">
                {children}
              </main>
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
