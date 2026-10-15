import { useState } from 'react';
import { supabase } from '../supabase.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ type: 'err', text: error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error.message });
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg({ type: 'err', text: error.message });
      else if (!data.session) setMsg({ type: 'ok', text: 'Te enviamos un email de confirmación. Ábrelo desde este dispositivo y vuelve aquí para entrar.' });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Si el email existe, recibirás un enlace para entrar.' });
    }
    setBusy(false);
  };

  return (
    <div className="center">
      <form className="sheet" onSubmit={submit}>
        <img src="/icon.svg" alt="" width="56" height="56" style={{ borderRadius: 14 }} />
        <div className="stack">
          <span className="eyebrow">Presupuesto familiar</span>
          <h1>{mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Recuperar acceso'}</h1>
        </div>
        <div className="stack">
          <label className="lbl" htmlFor="email">Email</label>
          <input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== 'reset' && (
          <div className="stack">
            <label className="lbl" htmlFor="pw">Contraseña</label>
            <input id="pw" className="field" type="password" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {msg && <div className={`note ${msg.type}`}>{msg.text}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}</button>
        <div className="between">
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}>
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
          </button>
          {mode === 'login' && <button type="button" className="link" onClick={() => { setMode('reset'); setMsg(null); }}>Olvidé la contraseña</button>}
        </div>
      </form>
    </div>
  );
}
