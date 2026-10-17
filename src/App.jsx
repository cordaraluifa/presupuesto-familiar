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
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
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

const PREF_KEY = 'pf-household';
const readPref = () => { try { return localStorage.getItem(PREF_KEY); } catch { return null; } };
const writePref = (v) => { try { localStorage.setItem(PREF_KEY, v); } catch { /* sin almacenamiento */ } };

function Membership({ user }) {
  const [list, setList] = useState(undefined);
  const [hid, setHid] = useState(undefined);

  const check = async (prefer) => {
    const { data } = await supabase.from('members')
      .select('household_id, joined_at, households(name)')
      .eq('user_id', user.id).order('joined_at', { ascending: false });
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
    return <div className="center"><div className="sheet card"><h2>No se pudieron cargar los datos</h2><p className="small">{data.error}</p><button className="btn" onClick={data.reload}>Reintentar</button></div></div>;
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
