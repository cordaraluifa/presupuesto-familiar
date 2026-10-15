const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Icon = {
  chart: (p) => <svg width="22" height="22" viewBox="0 0 24 24" {...base} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  wallet: (p) => <svg width="22" height="22" viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></svg>,
  plus: (p) => <svg width="26" height="26" viewBox="0 0 24 24" {...base} strokeWidth="2.4" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  trend: (p) => <svg width="22" height="22" viewBox="0 0 24 24" {...base} {...p}><path d="M3 17l5-5 4 3 8-8M15 7h5v5" /></svg>,
  home: (p) => <svg width="22" height="22" viewBox="0 0 24 24" {...base} {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  left: (p) => <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>,
  right: (p) => <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>,
  close: (p) => <svg width="20" height="20" viewBox="0 0 24 24" {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  trash: (p) => <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
  alert: (p) => <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>,
  bolt: (p) => <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></svg>,
};
