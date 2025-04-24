import { Metadata } from 'next';
import AtendimentoDetalhes from './AtendimentoDetalhes';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const metadata: Metadata = {
  title: 'Detalhes do Atendimento',
};

export default function Page({ params }: PageProps) {
  return <AtendimentoDetalhes id={params.id} />;
} 