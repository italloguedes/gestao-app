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

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
