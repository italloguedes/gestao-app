import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { NextApiRequestContext } from 'next'

export async function GET(
  request: NextRequest,
  context: NextApiRequestContext
) {
  const { params } = context
  const id = params.id as string

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: NextApiRequestContext
) {
  const { params } = context
  const id = params.id as string

  try {
    const body = await request.json()
    const { data: user, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: NextApiRequestContext
) {
  const { params } = context
  const id = params.id as string

  try {
    const { error } = await supabase.from('users').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
