import './globals.css';

export const metadata = {
  title: 'Gestão App',
  description: 'Aplicação de gestão com autenticação Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}