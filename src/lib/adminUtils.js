export function dateKeyFromInput(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}-${m}-${d}`;
}

export function todayInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
