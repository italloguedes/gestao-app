import './globals.css';

export const metadata = {
  title: 'Sala Sensorial-app',
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