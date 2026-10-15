import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import MonthPicker from '../components/MonthPicker.jsx';
import { Icon } from '../components/Icons.jsx';
import { monthStats } from '../lib/useData.js';
import { GROUPS, OUTFLOW, money, addMonths, monthLabel, parseAmount } from '../lib/format.js';

const fmtInput = (n) => (n ? String(Number(n)).replace('.', ',') : '');

export default function Presupuesto({ data, month, setMonth, notify }) {
  const hid = data.household.id;
  const st = useMemo(() => monthStats(data, month), [data, month]);
  const prev = addMonths(month, -1);
  const prevBudgets = data.budgets.filter((b) => b.month === prev);

  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const d = {};
    for (const c of data.categories) d[c.id] = fmtInput(st.budgetByCat[c.id]);
    setDraft(d);
  }, [data, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = data.categories.filter((c) => !c.archived);
  const val = (id) => { const n = parseAmount(draft[id] || '0'); return Number.isFinite(n) ? n : 0; };
  const sumGroup = (k) => active.filter((c) => c.grp === k).reduce((s, c) => s + val(c.id), 0);
  const income = sumGroup('ingresos');
  const assigned = OUTFLOW.reduce((s, k) => s + sumGroup(k), 0);
  const free = income - assigned;
  const dirty = active.some((c) => val(c.id) !== (st.budgetByCat[c.id] || 0));

  const save = async () => {
    const bad = active.find((c) => draft[c.id] && !Number.isFinite(parseAmount(draft[c.id])));
    if (bad) { notify(`Importe no válido en ${bad.name}`); return; }
    setSaving(true);
    const rows = active
      .filter((c) => val(c.id) !== (st.budgetByCat[c.id] || 0))
      .map((c) => ({ household_id: hid, category_id: c.id, month, amount: val(c.id) }));
    const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'category_id,month' });
    setSaving(false);
    if (error) notify(error.message); else { notify('Presupuesto guardado'); data.reload(); }
  };

  const copyPrev = async () => {
    if (!prevBudgets.length) { notify(`No hay presupuesto en ${monthLabel(prev)}`); return; }
    if (st.hasBudget && !window.confirm(`Esto sustituye los importes de ${monthLabel(month)} por los de ${monthLabel(prev)}. ¿Continuar?`)) return;
    const rows = prevBudgets.map((b) => ({ household_id: hid, category_id: b.category_id, month, amount: b.amount }));
    const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'category_id,month' });
    if (error) notify(error.message); else { notify(`Copiado de ${monthLabel(prev)}`); data.reload(); }
  };

  const rename = async (c) => {
    const name = window.prompt('Nuevo nombre de la partida', c.name);
    if (!name || name.trim() === c.name) return;
    const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', c.id);
    if (error) notify(error.message); else data.reload();
  };

  const setGoal = async (c) => {
    const label = c.grp === 'deudas' ? 'Importe total de la deuda (al empezar a registrar pagos)' : 'Meta de ahorro';
    const v = window.prompt(`${label} para "${c.name}" (vacío para quitarla)`, c.goal_amount ? fmtInput(c.goal_amount) : '');
    if (v === null) return;
    const n = v.trim() ? parseAmount(v) : null;
    if (v.trim() && !Number.isFinite(n)) { notify('Importe no válido'); return; }
    const { error } = await supabase.from('categories').update({ goal_amount: n }).eq('id', c.id);
    if (error) notify(error.message); else data.reload();
  };

  const archive = async (c) => {
    if (!window.confirm(`¿Quitar "${c.name}"? Sus movimientos pasados se conservan.`)) return;
    const { error } = await supabase.from('categories').update({ archived: true }).eq('id', c.id);
    if (error) notify(error.message); else data.reload();
  };

  const addCategory = async (grp) => {
    if (!newName.trim()) { setAdding(null); return; }
    const sort = Math.max(0, ...data.categories.filter((c) => c.grp === grp).map((c) => c.sort)) + 1;
    const { error } = await supabase.from('categories').insert({ household_id: hid, grp, name: newName.trim(), sort });
    if (error) notify(error.message); else { setNewName(''); setAdding(null); data.reload(); }
  };

  const share = (k) => (income > 0 ? Math.max(0, (sumGroup(k) / income) * 100) : 0);
  const colors = Object.fromEntries(GROUPS.map((g) => [g.key, g.color]));

  return (
    <main className="app">
      <header className="stack" style={{ gap: 2 }}>
        <MonthPicker month={month} setMonth={setMonth} />
        <h1 style={{ marginLeft: 6 }}>Presupuesto</h1>
      </header>

      <div className="row">
        <button className="btn ghost" style={{ flex: 1 }} onClick={copyPrev}>Copiar de {monthLabel(prev).split(' ')[0].toLowerCase()}</button>
        <button className="btn" style={{ flex: 1, minHeight: 44, fontSize: 13 }} disabled={!dirty || saving} onClick={save}>{saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}</button>
      </div>

      <section className="card">
        <div className="grid3">
          <div className="stack" style={{ gap: 2 }}><span className="small">Ingresos</span><span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{money(income)}</span></div>
          <div className="stack" style={{ gap: 2 }}><span className="small">Asignado</span><span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{money(assigned)}</span></div>
          <div className="stack" style={{ gap: 2 }}><span className="small">Sin asignar</span><span className="num" style={{ fontSize: 17, fontWeight: 700, color: free < 0 ? 'var(--over)' : 'var(--warn)' }}>{money(free)}</span></div>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, background: 'var(--line)' }}>
          {OUTFLOW.map((k) => <div key={k} style={{ width: `${Math.min(100, share(k))}%`, background: colors[k] }} />)}
        </div>
        <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          <span>Fijos {Math.round(share('fijos'))}%</span><span>Variables {Math.round(share('variables'))}%</span>
          <span>Deudas {Math.round(share('deudas'))}%</span><span>Ahorro {Math.round(share('ahorro'))}%</span>
        </div>
        {free > 0 && <div className="note">Os quedan {money(free)} por asignar. Podéis llevarlos a ahorro o a un objetivo.</div>}
        {free < 0 && <div className="note err">Habéis asignado {money(-free)} más de lo que ingresáis.</div>}
      </section>

      {GROUPS.map((g) => {
        const cats = active.filter((c) => c.grp === g.key);
        return (
          <section key={g.key} className="card list" style={{ paddingBottom: 12 }}>
            <div className="between" style={{ padding: '12px 0 6px' }}>
              <div className="row"><span className="dot" style={{ background: g.color }} /><h2>{g.label}</h2></div>
              <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{money(sumGroup(g.key))}</span>
            </div>
            {cats.map((c) => {
              const hasGoal = (g.key === 'ahorro' || g.key === 'deudas');
              const total = data.totals[c.id] || 0;
              const goal = Number(c.goal_amount) || 0;
              const pct = goal ? Math.min(100, Math.round((total / goal) * 100)) : 0;
              const sub = !hasGoal ? `Real este mes: ${money(st.realByCat[c.id] || 0)}`
                : goal ? (g.key === 'deudas' ? `Pagado ${money(total)} · quedan ${money(Math.max(0, goal - total))}` : `${money(total)} de ${money(goal)}`)
                : `Acumulado ${money(total)}`;
              return (
                <div key={c.id} className="item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '10px 0' }}>
                  <div className="between" style={{ gap: 10 }}>
                    <div className="grow" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button className="title" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => rename(c)} aria-label={`Renombrar ${c.name}`}>{c.name}</button>
                      <span className="small">{sub}{hasGoal && <> · <button className="link" style={{ fontSize: 12, minHeight: 0 }} onClick={() => setGoal(c)}>{goal ? 'cambiar meta' : g.key === 'deudas' ? 'poner deuda total' : 'poner meta'}</button></>}</span>
                    </div>
                    <label className="vh" htmlFor={`b-${c.id}`}>Presupuesto {c.name}</label>
                    <input id={`b-${c.id}`} className="amt" inputMode="decimal" placeholder="0" value={draft[c.id] ?? ''} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
                    <button className="iconbtn" aria-label={`Quitar ${c.name}`} onClick={() => archive(c)}><Icon.trash /></button>
                  </div>
                  {hasGoal && goal > 0 && <div className="bar" style={{ height: 6 }}><span style={{ width: `${pct}%`, background: g.color }} /></div>}
                </div>
              );
            })}
            {adding === g.key ? (
              <form className="row" style={{ paddingTop: 10 }} onSubmit={(e) => { e.preventDefault(); addCategory(g.key); }}>
                <label className="vh" htmlFor={`n-${g.key}`}>Nombre de la nueva partida</label>
                <input id={`n-${g.key}`} className="field" style={{ height: 44 }} autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la partida" />
                <button className="btn" style={{ minHeight: 44 }}>Añadir</button>
              </form>
            ) : (
              <button className="link" style={{ alignSelf: 'flex-start', paddingTop: 10 }} onClick={() => { setAdding(g.key); setNewName(''); }}>+ Añadir partida</button>
            )}
          </section>
        );
      })}
      <p className="small" style={{ textAlign: 'center' }}>Toca el nombre de una partida para renombrarla.</p>
    </main>
  );
}
