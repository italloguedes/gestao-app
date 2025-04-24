import { Metadata } from 'next';
import AtendimentoDetalhes from './AtendimentoDetalhes';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Atendimento ${resolvedParams.id} - Detalhes`,
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return <AtendimentoDetalhes id={resolvedParams.id} />;
} 