import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Faltam as variáveis de ambiente do Supabase no .env.local!')
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}