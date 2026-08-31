export function dateKeyFromInput(dateStr) {
  // dateStr is "YYYY-MM-DD" from a date input; convert to the same
  // no-leading-zero format todayKey() uses, e.g. "2026-9-1".
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}-${m}-${d}`;
}

export function todayInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
