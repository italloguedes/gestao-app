'use client';

import { Metadata } from 'next';
import AtendimentoDetalhes from './AtendimentoDetalhes';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Atendimento ${params.id} - Detalhes`,
  };
}

export default function Page({ params }: PageProps) {
  return <AtendimentoDetalhes id={params.id} />;
} 