import { useState } from 'react';
import { supabase } from '../supabase.js';
import MonthPicker from '../components/MonthPicker.jsx';
import { Icon } from '../components/Icons.jsx';
import { monthStats } from '../lib/useData.js';
import { GROUPS, GROUP, OUTFLOW, money, money2, monthOf, daysInMonth, dateLabel, initial, personColor, addMonths } from '../lib/format.js';

export default function Resumen({ data, user, month, setMonth, go, notify }) {
  const [showAll, setShowAll] = useState(false);
  const st = monthStats(data, month);
  const g = (k) => st.groups[k] || { budget: 0, real: 0, cats: [] };

  const income = g('ingresos').real;
  const outReal = OUTFLOW.reduce((s, k) => s + g(k).real, 0);
  const outBudget = OUTFLOW.reduce((s, k) => s + g(k).budget, 0);
  const usedPct = outBudget ? Math.round((outReal / outBudget) * 100) : 0;
  const isCurrent = month === monthOf();
  const day = new Date().getDate();
  const dim = daysInMonth(month);
  const dayPct = isCurrent ? Math.round((day / dim) * 100) : month < monthOf() ? 100 : 0;

  const alerts = OUTFLOW.flatMap((k) => g(k).cats)
    .filter((c) => c.grp !== 'ahorro' && c.budget > 0 && c.real / c.budget >= 0.8)
    .sort((a, b) => b.real / b.budget - a.real / a.budget);

  const next = addMonths(month, 1);
  const moves = data.transactions.filter((t) => t.date >= month && t.date < next);
  const catById = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const memberIdx = Object.fromEntries(data.members.map((m, i) => [m.user_id, i]));

  const remove = async (t) => {
    if (!window.confirm(`¿Borrar ${money2(t.amount)} en ${catById[t.category_id]?.name}?`)) return;
    const { error } = await supabase.from('transactions').delete().eq('id', t.id);
    if (error) notify(error.message); else { notify('Movimiento borrado'); data.reload(); }
  };

  return (
    <main className="app">
      <header className="between">
        <div className="stack" style={{ gap: 2 }}>
          <MonthPicker month={month} setMonth={setMonth} />
          <h1 style={{ marginLeft: 6 }}>Resumen</h1>
        </div>
        <button className="avatars" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} aria-label="Miembros del hogar" onClick={() => go('hogar')}>
          {data.members.map((m, i) => <span key={m.user_id} className="avatar" style={{ background: personColor(i) }}>{initial(m.display_name)}</span>)}
        </button>
      </header>

      <section className="hero">
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>Disponible este mes</div>
        <div className="big num">{money(income - outReal)}</div>
        <div className="grid2">
          <div className="stack" style={{ gap: 2 }}><span className="lbl" style={{ color: '#fff', opacity: 0.85, fontWeight: 400, fontSize: 12 }}>Ingresos reales</span><span className="val num">{money(income)}</span></div>
          <div className="stack" style={{ gap: 2 }}><span className="lbl" style={{ color: '#fff', opacity: 0.85, fontWeight: 400, fontSize: 12 }}>Salidas reales</span><span className="val num">{money(outReal)}</span></div>
        </div>
        {outBudget > 0 && (
          <div className="stack">
            <div className="bar"><span style={{ width: `${Math.min(usedPct, 100)}%` }} />{isCurrent && <i style={{ left: `${dayPct}%` }} />}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Has usado el {usedPct}% del presupuesto{isCurrent ? ` · el mes va por el ${dayPct}% (día ${day} de ${dim})` : ''}
            </div>
          </div>
        )}
      </section>

      {!st.hasBudget && (
        <div className="note">Aún no hay presupuesto para este mes. <button className="link" onClick={() => go('presupuesto')}>Crear presupuesto</button></div>
      )}

      <section className="card">
        <div className="between"><h2>Presupuesto vs real</h2><button className="link" onClick={() => go('presupuesto')}>Editar</button></div>
        {GROUPS.map((gr) => {
          const x = g(gr.key);
          const pct = x.budget ? Math.round((x.real / x.budget) * 100) : null;
          let status; let color = 'var(--muted)';
          if (pct === null) status = x.real ? 'sin presupuesto' : '—';
          else if (gr.key === 'ingresos') { status = `${pct}% · ${x.real >= x.budget ? '+' : '−'}${money(Math.abs(x.real - x.budget))}`; color = 'var(--accent)'; }
          else if (pct > 100) { status = `Excedido ${pct}%`; color = 'var(--over)'; }
          else status = `${pct}% · quedan ${money(x.budget - x.real)}`;
          return (
            <div key={gr.key} className="stack">
              <div className="between">
                <div className="row"><span className="dot" style={{ background: gr.color }} /><span style={{ fontSize: 14, fontWeight: 600 }}>{gr.label}</span></div>
                <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>{money(x.real)}</b> / {money(x.budget)}</span>
              </div>
              <div className="bar"><span style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: gr.color }} /></div>
              <div className="between small"><span>{gr.hint}</span><span className="num" style={{ fontWeight: 600, color }}>{status}</span></div>
            </div>
          );
        })}
      </section>

      {alerts.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2>Alertas</h2>
          {alerts.slice(0, 4).map((c) => {
            const pct = Math.round((c.real / c.budget) * 100);
            const over = pct > 100;
            return (
              <div key={c.id} className={`alert ${over ? 'over' : ''}`}>
                <span className="ic" style={{ background: over ? '#FBE9E6' : 'var(--warn-bg)', color: over ? 'var(--over)' : 'var(--warn)' }}>{over ? <Icon.alert /> : <Icon.bolt />}</span>
                <div className="stack" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name} {over ? 'superado' : 'cerca del límite'}</span>
                  <span className="small num">{money(c.real)} de {money(c.budget)} · {pct}% ({GROUP[c.grp].label.toLowerCase()})</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card list">
        <div className="between" style={{ padding: '12px 0 4px' }}>
          <h2>Movimientos del mes</h2>
          {moves.length > 5 && <button className="link" onClick={() => setShowAll(!showAll)}>{showAll ? 'Ver menos' : `Ver todos (${moves.length})`}</button>}
        </div>
        {moves.length === 0 && <div className="item small">Todavía no hay movimientos. Pulsa + para añadir el primero.</div>}
        {(showAll ? moves : moves.slice(0, 5)).map((t) => {
          const c = catById[t.category_id];
          const idx = memberIdx[t.paid_by];
          const who = t.paid_by ? data.members[idx] : null;
          const isIncome = c?.grp === 'ingresos';
          return (
            <div key={t.id} className="item">
              <span className="avatar" style={{ background: who ? personColor(idx) : '#5B6660' }} title={who ? who.display_name : 'Compartido'}>{who ? initial(who.display_name) : '='}</span>
              <div className="grow">
                <span className="title">{t.note || c?.name}</span>
                <span className="small">{c?.name} · {GROUP[c?.grp]?.label.toLowerCase()} · {dateLabel(t.date)}</span>
              </div>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: isIncome ? 'var(--accent)' : 'var(--ink)' }}>{isIncome ? '+' : '−'}{money2(t.amount)}</span>
              <button className="iconbtn" aria-label="Borrar movimiento" onClick={() => remove(t)}><Icon.trash /></button>
            </div>
          );
        })}
      </section>
    </main>
  );
}
