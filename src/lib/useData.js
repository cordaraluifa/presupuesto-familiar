import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { addMonths, monthOf } from './format.js';

// Carga todo lo que la app necesita del hogar: miembros, categorías,
// presupuestos y movimientos de los últimos 12 meses, y totales acumulados.
export function useHouseholdData(householdId) {
  const [state, setState] = useState({ loading: true, error: null });
  const timer = useRef(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    const from = addMonths(monthOf(), -11);
    const to = addMonths(monthOf(), 2);
    let all;
    try {
      all = await Promise.race([Promise.all([
      supabase.from('households').select('*').eq('id', householdId).single(),
      supabase.from('members').select('*').eq('household_id', householdId).order('joined_at'),
      supabase.from('categories').select('*').eq('household_id', householdId).order('sort').order('created_at'),
      supabase.from('budgets').select('*').eq('household_id', householdId).gte('month', from).lt('month', to),
      supabase.from('transactions').select('*').eq('household_id', householdId).gte('date', from).lt('date', to)
        .order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5000),
      supabase.from('category_totals').select('*').eq('household_id', householdId),
      ]), new Promise((_, rej) => setTimeout(() => rej(new Error('La base de datos no responde (tiempo de espera agotado).')), 15000))]);
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message })); return;
    }
    const [hh, mem, cats, buds, txs, tots] = all;
    const error = [hh, mem, cats, buds, txs, tots].find((r) => r.error)?.error;
    if (error) { setState((s) => ({ ...s, loading: false, error: error.message })); return; }
    setState({
      loading: false,
      error: null,
      household: hh.data,
      members: mem.data,
      categories: cats.data,
      budgets: buds.data,
      transactions: txs.data,
      totals: Object.fromEntries(tots.data.map((t) => [t.category_id, Number(t.total)])),
    });
  }, [householdId]);

  useEffect(() => {
    load();
    if (!householdId) return undefined;
    // Tiempo real: si el otro miembro carga algo, se refresca solo.
    const debounced = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 300); };
    const channel = supabase
      .channel(`hh-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `household_id=eq.${householdId}` }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `household_id=eq.${householdId}` }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${householdId}` }, debounced)
      .subscribe();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [householdId, load]);

  return { ...state, reload: load };
}

// Cálculos de un mes: presupuesto y real por categoría y por grupo.
export function monthStats(data, month) {
  const next = addMonths(month, 1);
  const budgetByCat = {};
  for (const b of data.budgets) if (b.month === month) budgetByCat[b.category_id] = Number(b.amount);
  const realByCat = {};
  for (const t of data.transactions) {
    if (t.date >= month && t.date < next) realByCat[t.category_id] = (realByCat[t.category_id] || 0) + Number(t.amount);
  }
  const groups = {};
  for (const c of data.categories) {
    const g = (groups[c.grp] ||= { budget: 0, real: 0, cats: [] });
    const budget = budgetByCat[c.id] || 0;
    const real = realByCat[c.id] || 0;
    if (c.archived && !budget && !real) continue;
    g.budget += budget;
    g.real += real;
    g.cats.push({ ...c, budget, real });
  }
  return { groups, budgetByCat, realByCat, hasBudget: Object.keys(budgetByCat).length > 0 };
}
