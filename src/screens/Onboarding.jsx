import { useState } from 'react';
import { supabase } from '../supabase.js';

export default function Onboarding({ onDone }) {
  const [mode, setMode] = useState('create');
  const [name, setName] = useState('');
  const [household, setHousehold] = useState('Nuestro hogar');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { data, error } = mode === 'create'
      ? await supabase.rpc('create_household', { p_name: household, p_display_name: name.trim() })
      : await supabase.rpc('join_household', { p_code: code, p_display_name: name.trim() });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone(data);
  };

  return (
    <div className="center">
      <form className="sheet" onSubmit={submit}>
        <div className="stack">
          <span className="eyebrow">Bienvenido</span>
          <h1>Vuestro hogar</h1>
        </div>
        <div className="seg" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }} role="group" aria-label="Opción">
          <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Crear hogar</button>
          <button type="button" aria-pressed={mode === 'join'} onClick={() => setMode('join')}>Tengo un código</button>
        </div>
        <div className="stack">
          <label className="lbl" htmlFor="nm">Tu nombre</label>
          <input id="nm" className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Luis" />
        </div>
        {mode === 'create' ? (
          <div className="stack">
            <label className="lbl" htmlFor="hh">Nombre del hogar</label>
            <input id="hh" className="field" value={household} onChange={(e) => setHousehold(e.target.value)} />
            <span className="small">Se crean categorías de ejemplo que podréis renombrar o borrar.</span>
          </div>
        ) : (
          <div className="stack">
            <label className="lbl" htmlFor="cd">Código de invitación</label>
            <input id="cd" className="field" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej.: 7F3A9C21" style={{ letterSpacing: 2, fontWeight: 700 }} />
            <span className="small">Te lo da la otra persona desde la pestaña Hogar.</span>
          </div>
        )}
        {err && <div className="note err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Un momento…' : mode === 'create' ? 'Crear hogar' : 'Unirme'}</button>
        <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </form>
    </div>
  );
}
