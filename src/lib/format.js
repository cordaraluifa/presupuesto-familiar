const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });

export const money = (n) => eur0.format(Math.round(Number(n) || 0));
export const money2 = (n) => eur2.format(Number(n) || 0);

export const GROUPS = [
  { key: 'ingresos', label: 'Ingresos', hint: 'Nóminas y extras', color: '#1F5C46' },
  { key: 'fijos', label: 'Gastos fijos', hint: 'Alquiler, suministros, seguros…', color: '#2B4C7E' },
  { key: 'variables', label: 'Gastos variables', hint: 'Súper, ocio, transporte…', color: '#D08A2E' },
  { key: 'deudas', label: 'Deudas', hint: 'Préstamos y tarjeta', color: '#7A3B5E' },
  { key: 'ahorro', label: 'Ahorro y futuro', hint: 'Fondo, viajes, objetivos…', color: '#3E9A8F' },
];
export const GROUP = Object.fromEntries(GROUPS.map((g) => [g.key, g]));
export const OUTFLOW = ['fijos', 'variables', 'deudas', 'ahorro'];

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Un "mes" es un string 'YYYY-MM-01'
export const monthOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
export const addMonths = (m, n) => {
  const [y, mo] = m.split('-').map(Number);
  return monthOf(new Date(y, mo - 1 + n, 1));
};
export const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS[mo - 1]} ${y}`;
};
export const monthShort = (m) => SHORT[Number(m.split('-')[1]) - 1];
export const monthEnd = (m) => addMonths(m, 1); // exclusivo
export const daysInMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const dateLabel = (iso) => {
  const t = today();
  if (iso === t) return 'hoy';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (iso === `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`) return 'ayer';
  const [, mo, d] = iso.split('-').map(Number);
  return `${d} ${SHORT[mo - 1].toLowerCase()}`;
};

export const parseAmount = (s) => {
  const clean = String(s).trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? n : NaN;
};

export const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();
const PALETTE = ['#2B4C7E', '#7A3B5E', '#3E9A8F', '#D08A2E'];
export const personColor = (i) => PALETTE[i % PALETTE.length];
