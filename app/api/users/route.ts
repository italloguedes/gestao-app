import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/models/User';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

// Configuração de runtime para Vercel
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 segundos (máximo no plano gratuito)

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões (requer admin ou superadmin)
    const authCheck = await checkAuth(request, 'admin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas administradores podem listar usuários');
    }

    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões (requer superadmin)
    const authCheck = await checkAuth(request, 'superadmin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas super administradores podem criar usuários');
    }

    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 
