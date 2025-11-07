// utils/date.js
// - YYYY-MM-DD 포맷러 (로컬 타임존 기준)
// - 입력: Date | number | string | undefined

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

export function formatDate(input) {
  const d = input ? new Date(input) : new Date();

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());

  return `${y}-${m}-${day}`;
}
