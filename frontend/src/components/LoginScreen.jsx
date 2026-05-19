import React, { useState } from 'react'
import { motion } from 'framer-motion'

export default function LoginScreen({ onLogin }) {
  const [name,  setName]  = useState('')
  const [pass,  setPass]  = useState('')
  const [error, setError] = useState('')
  const [mode,  setMode]  = useState('login') // login | register

  // Usuarios guardados en localStorage (simple, sin servidor)
  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('fs_users') || '{}') }
    catch { return {} }
  }

  const handleSubmit = () => {
    if (!name.trim() || !pass.trim()) {
      setError('Completa todos los campos.')
      return
    }
    const users = getUsers()

    if (mode === 'register') {
      if (users[name]) { setError('Ese usuario ya existe.'); return }
      users[name] = { password: pass, createdAt: new Date().toISOString() }
      localStorage.setItem('fs_users', JSON.stringify(users))
      onLogin({ name, createdAt: users[name].createdAt })
    } else {
      if (!users[name] || users[name].password !== pass) {
        setError('Usuario o contraseña incorrectos.')
        return
      }
      onLogin({ name, createdAt: users[name].createdAt })
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: '44px 48px',
          width: 380,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--rose-500)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 20px rgba(224,40,111,.3)',
          }}>
            <span style={{ fontSize: 26 }}>✦</span>
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 700,
            color: 'var(--text-heading)', marginBottom: 4,
          }}>FluoroScan Pro</h1>
          <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>
            {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)',
                            display: 'block', marginBottom: 5 }}>
              Usuario
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Tu nombre de usuario"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)',
                            display: 'block', marginBottom: 5 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 11, color: 'var(--rose-700)',
                        background: 'var(--rose-50)',
                        border: '1px solid var(--rose-200)',
                        borderRadius: 8, padding: '7px 12px' }}>
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: .97 }}
            onClick={handleSubmit}
            style={{
              background: 'var(--rose-500)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--r-full)',
              padding: '12px', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(224,40,111,.28)',
              marginTop: 4,
            }}
          >
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </motion.button>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-hint)' }}>
            {mode === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       color: 'var(--rose-500)', fontSize: 11, fontWeight: 600 }}
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const inputStyle = {
  width: '100%', background: 'var(--bg-tint)',
  border: '1.5px solid var(--border-soft)',
  borderRadius: 10, padding: '10px 14px',
  fontSize: 13, color: 'var(--text-body)',
  outline: 'none', boxSizing: 'border-box',
}
