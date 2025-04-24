import { Metadata } from 'next';
import AtendimentoDetalhes from './AtendimentoDetalhes';

type Props = {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Atendimento ${params.id} - Detalhes`,
  };
}

export default async function Page({ params }: Props) {
  return <AtendimentoDetalhes id={params.id} />;
} 