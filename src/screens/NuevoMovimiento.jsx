import { useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import { Icon } from '../components/Icons.jsx';
import { monthStats } from '../lib/useData.js';
import { GROUP, money, parseAmount, today, monthOf } from '../lib/format.js';

const TYPES = [
  { key: 'gasto', label: 'Gasto', groups: ['variables', 'fijos'] },
  { key: 'ingreso', label: 'Ingreso', groups: ['ingresos'] },
  { key: 'deuda', label: 'Deuda', groups: ['deudas'] },
  { key: 'ahorro', label: 'Ahorro', groups: ['ahorro'] },
];

export default function NuevoMovimiento({ data, user, go, notify }) {
  const [type, setType] = useState('gasto');
  const [catId, setCatId] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [payer, setPayer] = useState(user.id);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const t = TYPES.find((x) => x.key === type);
  const cats = data.categories.filter((c) => !c.archived && t.groups.includes(c.grp))
    .sort((a, b) => t.groups.indexOf(a.grp) - t.groups.indexOf(b.grp) || a.sort - b.sort);
  const current = cats.find((c) => c.id === catId) || null;

  const month = date ? `${date.slice(0, 7)}-01` : monthOf();
  const st = useMemo(() => monthStats(data, month), [data, month]);
  const n = parseAmount(amount);
  const add = Number.isFinite(n) && n > 0 ? n : 0;

  let impact = null;
  if (current) {
    const before = st.realByCat[current.id] || 0;
    const budget = st.budgetByCat[current.id] || 0;
    const after = before + add;
    impact = {
      text: budget ? `${money(before)} → ${money(after)} de ${money(budget)} (${Math.round((after / budget) * 100)}%)` : `${money(before)} → ${money(after)} (sin presupuesto)`,
      beforePct: budget ? Math.min(100, (before / budget) * 100) : 0,
      addPct: budget ? Math.max(0, Math.min(100 - Math.min(100, (before / budget) * 100), (add / budget) * 100)) : 0,
      over: budget && after > budget && current.grp !== 'ingresos' && current.grp !== 'ahorro',
    };
  }

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    if (!current) { setErr('Elige una categoría.'); return; }
    if (!add) { setErr('Escribe un importe mayor que 0.'); return; }
    setBusy(true);
    const { error } = await supabase.from('transactions').insert({
      household_id: data.household.id, category_id: current.id, amount: add, date, note: note.trim() || null,
      paid_by: payer === 'shared' ? null : payer,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    notify(`Guardado: ${money(add)} en ${current.name}`);
    await data.reload();
    go('resumen');
  };

  return (
    <form className="app plain" onSubmit={save}>
      <header className="between">
        <button type="button" className="iconbtn" style={{ width: 44, height: 44, background: '#fff', color: 'var(--ink)' }} aria-label="Cerrar" onClick={() => go('resumen')}><Icon.close /></button>
        <h1 style={{ fontSize: 20 }}>Nuevo movimiento</h1>
        <span style={{ width: 44 }} />
      </header>

      <div className="seg" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} role="group" aria-label="Tipo de movimiento">
        {TYPES.map((x) => <button type="button" key={x.key} aria-pressed={type === x.key} onClick={() => { setType(x.key); setCatId(null); }}>{x.label}</button>)}
      </div>

      <div className="stack" style={{ alignItems: 'center', padding: '8px 0' }}>
        <label htmlFor="importe" className="lbl">Importe</label>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <input id="importe" inputMode="decimal" autoComplete="off" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="num"
            style={{ width: 200, border: 0, background: 'transparent', textAlign: 'right', font: "700 52px 'Bricolage Grotesque', sans-serif", padding: 0 }} />
          <span style={{ font: "700 40px 'Bricolage Grotesque', sans-serif", color: 'var(--muted)' }}>€</span>
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <span className="lbl">Categoría</span>
        {t.groups.map((gk) => {
          const list = cats.filter((c) => c.grp === gk);
          return (
            <div key={gk} className="stack">
              {t.groups.length > 1 && <span className="small">{GROUP[gk].label}</span>}
              <div className="chips">
                {list.map((c) => <button type="button" key={c.id} className="chip" aria-pressed={c.id === catId} onClick={() => setCatId(c.id)}>{c.name}</button>)}
                {list.length === 0 && <span className="small">No hay partidas. Créalas en Presupuesto.</span>}
              </div>
            </div>
          );
        })}
        {impact && (
          <div className="card num" style={{ padding: '12px 14px', gap: 8, borderRadius: 14 }}>
            <div className="between" style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{current.name} este mes</span>
              <span style={{ color: impact.over ? 'var(--over)' : 'var(--muted)', fontWeight: impact.over ? 600 : 400 }}>{impact.text}</span>
            </div>
            <div className="bar">
              <span style={{ width: `${impact.beforePct}%`, background: 'var(--accent)' }} />
              <span style={{ left: `${impact.beforePct}%`, width: `${impact.addPct}%`, background: impact.over ? '#E59A8F' : '#8FC1AE', borderRadius: 0 }} />
            </div>
          </div>
        )}
      </div>

      <div className="stack">
        <label htmlFor="fecha" className="lbl">Fecha</label>
        <input id="fecha" className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="stack">
        <span className="lbl">{type === 'ingreso' ? 'Recibido por' : 'Pagado por'}</span>
        <div className="chips" role="group" aria-label="Pagado por">
          {data.members.map((m) => <button type="button" key={m.user_id} className="chip" aria-pressed={payer === m.user_id} onClick={() => setPayer(m.user_id)}>{m.display_name}</button>)}
          <button type="button" className="chip" aria-pressed={payer === 'shared'} onClick={() => setPayer('shared')}>Compartido</button>
        </div>
      </div>

      <div className="stack">
        <label htmlFor="nota" className="lbl">Nota (opcional)</label>
        <input id="nota" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: compra semanal" />
      </div>

      {err && <div className="note err">{err}</div>}
      <button className="btn" style={{ minHeight: 56, fontSize: 16, marginTop: 8 }} disabled={busy}>{busy ? 'Guardando…' : 'Guardar movimiento'}</button>
    </form>
  );
}
