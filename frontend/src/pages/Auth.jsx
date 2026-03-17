import { useState, useEffect } from 'react'
import useStore from '../zustand/store'
import axios from 'axios'
import { toast } from 'react-toastify'

function InputField({ label, type = 'text', value, onChange, error }) {
  const [focused, setFocused] = useState(false)
  const [show,    setShow]    = useState(false)

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '10px', color: '#aaa' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type === 'password' ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '4px',
            borderRadius: '6px',
            border: `1px solid ${error ? '#ff6b6b' : focused ? '#4dabf7' : '#333'}`,
            background: '#111',
            color: '#eee',
            fontSize: '12px',
            outline: 'none',
          }}
        />
        {type === 'password' && (
          <button
            onClick={() => setShow(!show)}
            style={{
              position: 'absolute', right: '8px', top: '50%',
              transform: 'translateY(-50%)',
              border: 'none', background: 'none',
              color: '#777', cursor: 'pointer',
            }}
          >
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '10px', marginTop: '3px' }}>{error}</p>
      )}
    </div>
  )
}

export default function AuthModal() {
  const [mode,    setMode]    = useState('login')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirm: '' })
  const [errors,  setErrors]  = useState({})

  const { saveDetails, setLoggedIn, checkToken } = useStore()

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  const validate = () => {
    const e = {}
    if (mode === 'signup') {
      if (!form.username.trim()) e.username = 'Username required'
      if (form.password !== form.confirm) e.confirm = "Passwords don't match"
    }
    if (!form.email.includes('@')) e.email = 'Invalid email'
    if (form.password.length < 6)  e.password = 'Min 6 chars'
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)

    try {
      if (mode === 'login') {
        const result = await axios.post(
          'https://proper-flyingfish-elikana-f71f5476.koyeb.app/login',
          form
        )

        if (result.status === 200 || result.status === 201) {
          const { userName, userId, token, message } = result.data
          toast.success(message)

          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify({ userName, userId }))

          setLoggedIn(true)   // ← single source of truth
          saveDetails()
          checkToken()

          setForm({ username: '', email: '', password: '', confirm: '' })
          setErrors({})
        } else {
          toast.error(result.data.message || 'Login failed')
        }

      } else {
        const result = await axios.post(
          'https://proper-flyingfish-elikana-f71f5476.koyeb.app/signup',
          form
        )

        if (result.status === 201) {
          toast.success(result.data.message)
          setForm({ username: '', email: '', password: '', confirm: '' })
          setErrors({})
          setMode('login')
        } else {
          toast.error(result.data.message || 'Registration failed')
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fade { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      <div style={{
        width: '360px',
        background: '#0c0c0c',
        border: '1px solid #222',
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        animation: mounted ? 'fade .35s ease' : 'none',
        transition: 'all 0.3s ease',
      }}>

        {/* ── Mode tabs ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <button
            onClick={() => setMode('login')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none',
              background: mode === 'login' ? '#4dabf7' : '#222',
              color: '#fff', cursor: 'pointer', transition: 'all 0.3s',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none',
              background: mode === 'signup' ? '#4dabf7' : '#222',
              color: '#fff', cursor: 'pointer', transition: 'all 0.3s',
            }}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <InputField
            label="Username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            error={errors.username}
          />
        )}

        <InputField
          label="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />

        <InputField
          label="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />

        {mode === 'signup' && (
          <InputField
            label="Confirm Password"
            type="password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            error={errors.confirm}
          />
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: '100%', padding: '10px', marginTop: '6px',
            borderRadius: '6px', border: 'none',
            background: loading ? '#2a6a8a' : '#4dabf7',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Register'}
        </button>

      </div>
    </>
  )
}