import AtendimentoDetalhes from './AtendimentoDetalhes';

export default function Page({ params }: { params: { id: string } }) {
  return <AtendimentoDetalhes id={params.id} />;
} 