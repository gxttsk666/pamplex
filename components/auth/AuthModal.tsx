'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              username: username,
            },
          },
        })
        if (signUpError) throw signUpError
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isLogin ? 'Entrar no Pamplex' : 'Criar conta no Pamplex'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {isLogin ? 'Bem-vindo de volta!' : 'Junte-se à comunidade brasileira de chat e servidores.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Nome de Exibição
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Gustavo"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Nome de usuário (@username)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: gxttsk666"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-white focus:outline-none focus:border-teal-400"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Palavra-passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? 'A processar...' : isLogin ? 'Entrar' : 'Registar Conta'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-zinc-400">
          {isLogin ? (
            <p>
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-teal-400 hover:underline font-medium cursor-pointer"
              >
                Registar
              </button>
            </p>
          ) : (
            <p>
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-teal-400 hover:underline font-medium cursor-pointer"
              >
                Faça login
              </button>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  )
}