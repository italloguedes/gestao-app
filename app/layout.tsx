import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./background.css";
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sala Sensorial - ALECE",
  description: "Sistema de gestão empresarial desenvolvido para a Sala Sensorial da ALECE por Itallo Guedes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
