import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from '@/components/ClientLayout';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sala Sensorial - ALECE",
  description: "Sistema de gestão empresarial desenvolvido para a Sala Sensorial da ALECE por Itallo Guedes",
};

// Componente que será renderizado apenas no cliente
function BodyContent({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <body className={className} suppressHydrationWarning>
      <ClientLayout>{children}</ClientLayout>
      <Toaster />
    </body>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <BodyContent className={`${inter.className} min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 antialiased`}>
        {children}
      </BodyContent>
    </html>
  );
}
