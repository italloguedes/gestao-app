import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  switch (request.method) {
    case 'GET': {
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

    case 'PUT': {
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

    case 'DELETE': {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ message: 'User deleted successfully' })
      } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export { handler as GET, handler as PUT, handler as DELETE }
