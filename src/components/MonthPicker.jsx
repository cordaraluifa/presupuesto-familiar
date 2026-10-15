import { Icon } from './Icons.jsx';
import { addMonths, monthLabel } from '../lib/format.js';

export default function MonthPicker({ month, setMonth }) {
  return (
    <div className="row" style={{ gap: 2 }}>
      <button className="iconbtn" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}><Icon.left /></button>
      <span className="eyebrow">{monthLabel(month)}</span>
      <button className="iconbtn" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}><Icon.right /></button>
    </div>
  );
}
