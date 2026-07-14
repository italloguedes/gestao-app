import { redirect } from 'next/navigation';

export default function AdminGestaoViagensRedirect() {
  redirect('/dashboard/viagens');
}
