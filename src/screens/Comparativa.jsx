import { useMemo, useState } from 'react';
import MonthPicker from '../components/MonthPicker.jsx';
import { monthStats } from '../lib/useData.js';
import { GROUPS, GROUP, OUTFLOW, money, addMonths, monthLabel, monthShort, monthOf } from '../lib/format.js';

const FILTERS = [{ key: 'total', label: 'Total salidas', color: '#1F5C46' }, ...GROUPS.map((g) => ({ key: g.key, label: g.label.replace('Gastos ', ''), color: g.color }))];
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${money(Math.abs(n))}`;

export default function Comparativa({ data, month, setMonth }) {
  const [filter, setFilter] = useState('total');
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)), [month]);
  const stats = useMemo(() => Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)).map((m) => [m, monthStats(data, m)]),
  ), [data, month]);
  const [cmpA, setCmpA] = useState(null);
  const a = cmpA || addMonths(month, -1);

  const val = (m, key, field) => {
    const s = stats[m];
    if (key === 'total') return OUTFLOW.reduce((acc, k) => acc + (s.groups[k]?.[field] || 0), 0);
    return s.groups[key]?.[field] || 0;
  };
  const f = FILTERS.find((x) => x.key === filter);
  const goodWhenHigher = filter === 'ingresos' || filter === 'ahorro';
  const series = months.map((m) => ({ m, real: val(m, filter, 'real'), budget: val(m, filter, 'budget') }));
  const max = Math.max(1, ...series.map((s) => Math.max(s.real, s.budget))) * 1.1;
  const H = 150;
  const current = monthOf();

  const rows = GROUPS.map((g) => {
    const va = val(a, g.key, 'real'); const vb = val(month, g.key, 'real');
    const diff = vb - va; const pct = va ? Math.round((diff / va) * 100) : null;
    const higherGood = g.key === 'ingresos' || g.key === 'ahorro';
    const color = diff === 0 ? 'var(--muted)' : (diff > 0) === higherGood ? 'var(--accent)' : 'var(--over)';
    return { g, va, vb, diff, pct, color };
  });
  const totA = val(a, 'total', 'real'); const totB = val(month, 'total', 'real');

  const sm = stats[month];
  const deviations = Object.values(sm.groups).flatMap((g) => g.cats)
    .filter((c) => c.budget > 0 && c.grp !== 'ingresos')
    .map((c) => ({ ...c, pct: Math.round(((c.real - c.budget) / c.budget) * 100) }))
    .sort((x, y) => Math.abs(y.pct) - Math.abs(x.pct)).slice(0, 5);

  const savings = months.map((m) => val(m, 'ahorro', 'real'));
  const savingsTotal = savings.reduce((s, v) => s + v, 0);
  const savingsBudget = val(month, 'ahorro', 'budget');

  return (
    <main className="app">
      <header className="stack" style={{ gap: 2 }}>
        <MonthPicker month={month} setMonth={setMonth} />
        <h1 style={{ marginLeft: 6 }}>Comparativa</h1>
      </header>

      <div className="scrollx" role="group" aria-label="Filtrar por grupo">
        {FILTERS.map((x) => <button key={x.key} className="chip dark" aria-pressed={filter === x.key} onClick={() => setFilter(x.key)}>{x.label}</button>)}
      </div>

      <section className="card">
        <div className="between"><h2>Real por mes</h2><span className="small">{monthShort(months[0])} – {monthShort(month)}</span></div>
        <div className="chart">
          {series.map((s) => {
            const bad = s.budget > 0 && (goodWhenHigher ? s.real < s.budget : s.real > s.budget);
            const color = bad ? 'var(--over)' : f.color;
            const partial = s.m === current;
            return (
              <div key={s.m} className="col" style={{ position: 'relative', height: '100%', justifyContent: 'flex-end' }}>
                <span className="num" style={{ color }}>{s.real >= 1000 ? `${(s.real / 1000).toFixed(1).replace('.', ',')}k` : Math.round(s.real)}</span>
                <div style={{ height: Math.round((s.real / max) * H), background: color, opacity: partial ? 0.55 : 1 }} />
                {s.budget > 0 && <i aria-hidden="true" style={{ position: 'absolute', left: -3, right: -3, bottom: Math.round((s.budget / max) * H), borderTop: '2px dashed var(--ink)', opacity: 0.5 }} />}
              </div>
            );
          })}
        </div>
        <div className="grid3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginTop: -6 }}>
          {series.map((s) => <span key={s.m} className="small" style={{ textAlign: 'center' }}>{monthShort(s.m)}</span>)}
        </div>
        <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: f.color }} />Dentro de presupuesto</span>
          <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: 'var(--over)' }} />{goodWhenHigher ? 'Por debajo' : 'Por encima'}</span>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 14, borderTop: '2px dashed var(--ink)', opacity: 0.6 }} />Presupuesto</span>
        </div>
      </section>

      <section className="card" style={{ gap: 4, paddingBottom: 8 }}>
        <div className="between">
          <h2>Mes vs mes</h2>
          <label className="vh" htmlFor="cmp">Comparar {monthLabel(month)} con</label>
          <select id="cmp" className="field" style={{ width: 'auto', height: 36, fontSize: 13, fontWeight: 600 }} value={a} onChange={(e) => setCmpA(e.target.value)}>
            {Array.from({ length: 11 }, (_, i) => addMonths(month, -1 - i)).map((m) => <option key={m} value={m}>vs {monthLabel(m)}</option>)}
          </select>
        </div>
        <table className="num">
          <thead><tr><th scope="col">Grupo</th><th scope="col">{monthShort(a)}</th><th scope="col">{monthShort(month)}</th><th scope="col">Dif.</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.g.key}>
                <td>{r.g.label}</td><td>{money(r.va)}</td><td>{money(r.vb)}</td>
                <td style={{ color: r.color, fontWeight: 600 }}>{signed(r.diff)}{r.pct !== null && r.diff !== 0 ? ` · ${r.pct > 0 ? '+' : ''}${r.pct}%` : ''}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 700 }}>Total salidas</td><td style={{ fontWeight: 700 }}>{money(totA)}</td><td style={{ fontWeight: 700 }}>{money(totB)}</td>
              <td style={{ fontWeight: 700, color: totB > totA ? 'var(--over)' : 'var(--accent)' }}>{signed(totB - totA)}</td>
            </tr>
          </tbody>
        </table>
        {month === current && <span className="small" style={{ paddingTop: 6 }}>{monthLabel(month)} todavía está en curso.</span>}
      </section>

      <section className="card">
        <h2>Mayores desvíos en {monthLabel(month).split(' ')[0].toLowerCase()}</h2>
        {deviations.length === 0 && <span className="small">Sin presupuesto este mes para comparar.</span>}
        {deviations.map((c) => (
          <div key={c.id} className="between num" style={{ fontSize: 14 }}>
            <span>{c.name} <span className="small">· {GROUP[c.grp].label.toLowerCase()}</span></span>
            <span><span className="small">{money(c.real)} de {money(c.budget)}</span> <b style={{ color: c.pct > 0 && c.grp !== 'ahorro' ? 'var(--over)' : 'var(--accent)' }}>{c.pct > 0 ? '+' : ''}{c.pct}%</b></span>
          </div>
        ))}
      </section>

      <section className="card" style={{ background: '#3E9A8F', color: '#0F2E2A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="stack" style={{ gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Ahorro acumulado · 6 meses</span>
          <span className="num" style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700 }}>{money(savingsTotal)}</span>
        </div>
        <span className="num" style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>Media {money(savingsTotal / 6)}/mes{savingsBudget ? <><br />Meta {money(savingsBudget)}/mes</> : null}</span>
      </section>
    </main>
  );
}
