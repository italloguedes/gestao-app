import { supabase } from '@/lib/supabase'

export async function getUserById(id: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!user) throw new Error('User not found')

  return user
}

export async function updateUser(id: string, body: any) {
  const { data: user, error } = await supabase
    .from('users')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return user
}

export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { message: 'User deleted successfully' }
} 