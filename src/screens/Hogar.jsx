import { useState } from 'react';
import { supabase } from '../supabase.js';
import { initial, personColor } from '../lib/format.js';

export default function Hogar({ data, user, notify, households = [], switchTo }) {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState('');
  const me = data.members.find((m) => m.user_id === user.id);
  const [name, setName] = useState(me?.display_name || '');
  const [hhName, setHhName] = useState(data.household.name);
  const code = data.household.invite_code;
  const appUrl = window.location.origin;
  const inviteText = `Te invito a nuestro presupuesto familiar.\n1) Entra en ${appUrl} y crea tu cuenta.\n2) Elige "Tengo un código" y escribe: ${code}`;

  const counts = {};
  for (const t of data.transactions) counts[t.created_by] = (counts[t.created_by] || 0) + 1;

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Presupuesto familiar', text: inviteText }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(inviteText); notify('Invitación copiada'); } catch { notify(`Código: ${code}`); }
  };

  const join = async (e) => {
    e.preventDefault();
    setJoinErr('');
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    if (c === code) { setJoinErr('Ese es el código de este mismo hogar.'); return; }
    setJoining(true);
    const { data: newId, error } = await supabase.rpc('join_household', { p_code: c, p_display_name: me?.display_name || name.trim() || 'Yo' });
    setJoining(false);
    if (error) { setJoinErr(error.message.includes('no válido') ? 'Código no válido. Revísalo con la otra persona.' : error.message); return; }
    notify('Te has unido al hogar');
    switchTo(newId);
  };

  const saveName = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('members').update({ display_name: name.trim() }).eq('household_id', data.household.id).eq('user_id', user.id);
    if (error) notify(error.message); else { notify('Nombre actualizado'); data.reload(); }
  };
  const saveHh = async () => {
    if (!hhName.trim()) return;
    const { error } = await supabase.from('households').update({ name: hhName.trim() }).eq('id', data.household.id);
    if (error) notify(error.message); else { notify('Hogar actualizado'); data.reload(); }
  };

  return (
    <main className="app">
      <header className="stack" style={{ gap: 4 }}>
        <span className="eyebrow">{data.members.length} {data.members.length === 1 ? 'miembro' : 'miembros'}</span>
        <h1>{data.household.name}</h1>
      </header>

      <section className="card list">
        {data.members.map((m, i) => (
          <div key={m.user_id} className="item">
            <span className="avatar" style={{ width: 44, height: 44, borderRadius: 22, background: personColor(i) }}>{initial(m.display_name)}</span>
            <div className="grow">
              <span className="title" style={{ fontSize: 15 }}>{m.display_name}</span>
              <span className="small">{m.role === 'admin' ? 'Administrador' : 'Puede editar todo'}{m.user_id === user.id ? ' · tú' : ''}</span>
            </div>
            <span className="small num">{counts[m.user_id] || 0} movimientos</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Invitar a tu pareja</h2>
        <p className="small" style={{ margin: 0 }}>Que entre en la app, cree su cuenta, elija <b>"Tengo un código"</b> y escriba este código:</p>
        <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, letterSpacing: 4, textAlign: 'center', background: '#F8F9F6', borderRadius: 14, padding: '12px 0' }}>{code}</div>
        <button className="btn" onClick={share}>Enviar invitación</button>
      </section>

      <section className="card">
        <h2>Unirme a otro hogar</h2>
        <p className="small" style={{ margin: 0 }}>Si tu pareja ya creó el hogar, escribe aquí el código que ve en su pestaña Hogar. Pasarás a ver y cargar los mismos datos.</p>
        <form className="row" onSubmit={join}>
          <label className="vh" htmlFor="joincode">Código de invitación</label>
          <input id="joincode" className="field" autoComplete="off" autoCapitalize="characters" placeholder="Ej.: 7F3A9C21" value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ letterSpacing: 2, fontWeight: 700 }} />
          <button className="btn" style={{ minHeight: 48 }} disabled={joining || !joinCode.trim()}>{joining ? 'Uniendo…' : 'Unirme'}</button>
        </form>
        {joinErr && <div className="note err">{joinErr}</div>}
        {households.length > 1 && (
          <div className="stack">
            <label className="lbl" htmlFor="hhsel">Hogar que estás viendo</label>
            <select id="hhsel" className="field" value={data.household.id} onChange={(e) => switchTo(e.target.value)}>
              {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Ajustes</h2>
        <div className="stack">
          <label className="lbl" htmlFor="myname">Tu nombre</label>
          <div className="row"><input id="myname" className="field" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn ghost" onClick={saveName}>Guardar</button></div>
        </div>
        <div className="stack">
          <label className="lbl" htmlFor="hhname">Nombre del hogar</label>
          <div className="row"><input id="hhname" className="field" value={hhName} onChange={(e) => setHhName(e.target.value)} /><button className="btn ghost" onClick={saveHh}>Guardar</button></div>
        </div>
        <div className="note ok">
          <b>Usarla como app en el móvil:</b> en iPhone abre la web en Safari → botón Compartir → <i>Añadir a pantalla de inicio</i>. En Android, en Chrome → menú ⋮ → <i>Instalar aplicación</i>.
        </div>
      </section>

      <div className="between small" style={{ padding: '0 4px' }}>
        <span>{user.email}</span>
        <button className="btn danger" style={{ minHeight: 40, fontSize: 13 }} onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    </main>
  );
}
