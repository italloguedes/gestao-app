import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser, deleteUser } from '../services/userService'

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getUserById(context.params.id)
    return NextResponse.json(user)
  } catch (error: any) {
    if (error.message === 'User not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const body = await request.json()
    const user = await updateUser(context.params.id, body)
    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const result = await deleteUser(context.params.id)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
