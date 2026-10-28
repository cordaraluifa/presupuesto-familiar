import { useEffect, useState } from 'react';
import { supabase, configured, configError } from './supabase.js';
import { useHouseholdData } from './lib/useData.js';
import { monthOf } from './lib/format.js';
import { Icon } from './components/Icons.jsx';
import Login from './screens/Login.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Resumen from './screens/Resumen.jsx';
import Presupuesto from './screens/Presupuesto.jsx';
import NuevoMovimiento from './screens/NuevoMovimiento.jsx';
import Comparativa from './screens/Comparativa.jsx';
import Hogar from './screens/Hogar.jsx';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!configured) return undefined;
    withTimeout(supabase.auth.getSession()).then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return (
      <div className="center"><div className="sheet card">
        <h1>Falta configurar</h1>
        <div className="note err">{configError}</div>
        <p>Revisa <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_ANON_KEY</b> en Vercel → Settings → Environment Variables y vuelve a desplegar (Deployments → ⋯ → Redeploy).</p>
      </div></div>
    );
  }
  if (session === undefined) return <div className="center small">Cargando…</div>;
  if (!session) return <Login />;
  return <Membership user={session.user} />;
}

// Evita esperas infinitas si la base de datos no responde (p. ej. proyecto pausado).
export const withTimeout = (promise, ms = 15000) => Promise.race([
  promise,
  new Promise((_, rej) => setTimeout(() => rej(new Error('La base de datos no responde (tiempo de espera agotado).')), ms)),
]);

export function ConnectionError({ detail, onRetry }) {
  return (
    <div className="center"><div className="sheet card">
      <h1>Sin conexión con los datos</h1>
      <p style={{ margin: 0 }}>No se pudo conectar con la base de datos. Lo más habitual es que el proyecto de Supabase se haya <b>pausado por inactividad</b> (pasa en el plan gratuito tras 7 días sin uso).</p>
      <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
        <li>Entra en supabase.com y abre tu proyecto.</li>
        <li>Si pone <b>Paused</b>, pulsa <b>Restore project</b> y espera unos minutos.</li>
        <li>Vuelve aquí y pulsa Reintentar.</li>
      </ol>
      <div className="note err" style={{ overflowWrap: 'anywhere' }}>{detail}</div>
      <button className="btn" onClick={onRetry}>Reintentar</button>
      <button className="link" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div></div>
  );
}

const PREF_KEY = 'pf-household';
const readPref = () => { try { return localStorage.getItem(PREF_KEY); } catch { return null; } };
const writePref = (v) => { try { localStorage.setItem(PREF_KEY, v); } catch { /* sin almacenamiento */ } };

function Membership({ user }) {
  const [list, setList] = useState(undefined);
  const [hid, setHid] = useState(undefined);

  const [failed, setFailed] = useState(null);

  const check = async (prefer) => {
    setFailed(null);
    let res;
    try {
      res = await withTimeout(supabase.from('members')
        .select('household_id, joined_at, households(name)')
        .eq('user_id', user.id).order('joined_at', { ascending: false }));
    } catch (e) { res = { error: e }; }
    const { data, error } = res;
    // Si no hay conexión, no mostrar "Crear hogar" (crearía uno nuevo por error).
    if (error) { setFailed(error.message || String(error)); return; }
    const rows = (data || []).map((r) => ({ id: r.household_id, name: r.households?.name || 'Hogar' }));
    setList(rows);
    const want = prefer || readPref();
    // Por defecto, el hogar al que se unió más recientemente.
    const pick = rows.find((r) => r.id === want)?.id ?? rows[0]?.id ?? null;
    if (pick) writePref(pick);
    setHid(pick);
  };
  useEffect(() => { check(); }, [user.id]);

  const switchTo = (id) => { writePref(id); check(id); };

  if (failed) return <ConnectionError detail={failed} onRetry={() => check()} />;
  if (hid === undefined) return <div className="center small">Cargando…</div>;
  if (!hid) return <Onboarding user={user} onDone={switchTo} />;
  return <Shell key={hid} user={user} householdId={hid} households={list} switchTo={switchTo} />;
}

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: Icon.chart },
  { key: 'presupuesto', label: 'Presupuesto', icon: Icon.wallet },
  { key: 'nuevo', label: 'Añadir', icon: Icon.plus, fab: true },
  { key: 'comparar', label: 'Comparar', icon: Icon.trend },
  { key: 'hogar', label: 'Hogar', icon: Icon.home },
];

function Shell({ user, householdId, households, switchTo }) {
  const data = useHouseholdData(householdId);
  const [tab, setTab] = useState('resumen');
  const [month, setMonth] = useState(monthOf());
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const go = (t) => { if (t !== 'nuevo') setEditing(null); setTab(t); window.scrollTo(0, 0); };
  const edit = (tx) => { setEditing(tx); setTab('nuevo'); window.scrollTo(0, 0); };

  if (data.loading) return <div className="center small">Cargando datos…</div>;
  if (data.error) {
    return <ConnectionError detail={data.error} onRetry={data.reload} />;
  }

  const props = { data, user, month, setMonth, go, notify, edit, households, switchTo };
  return (
    <>
      {tab === 'resumen' && <Resumen {...props} />}
      {tab === 'presupuesto' && <Presupuesto {...props} />}
      {tab === 'nuevo' && <NuevoMovimiento key={editing?.id || 'new'} {...props} editing={editing} />}
      {tab === 'comparar' && <Comparativa {...props} />}
      {tab === 'hogar' && <Hogar {...props} />}
      {tab !== 'nuevo' && (
        <nav className="nav" aria-label="Navegación principal">
          <div className="nav-inner">
            {TABS.map((t) => (
              <button key={t.key} className={t.fab ? 'fab' : ''} aria-label={t.fab ? 'Añadir movimiento' : undefined}
                aria-current={tab === t.key ? 'page' : undefined} onClick={() => { setEditing(null); go(t.key); }}>
                <t.icon />{!t.fab && t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
