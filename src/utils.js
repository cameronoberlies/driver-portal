// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToWed = day >= 3 ? day - 3 : day + 4;
  const wed = new Date(d);
  wed.setDate(d.getDate() - diffToWed);
  wed.setHours(0, 0, 0, 0);
  const tue = new Date(wed);
  tue.setDate(wed.getDate() + 6);
  tue.setHours(23, 59, 59, 999);
  return { start: wed, end: tue };
}

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

export function formatCurrency(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export function getMonth(dateStr) { return dateStr.slice(0, 7); }

// Returns the upcoming Sunday (start of next availability week)
export function getNextWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSun = day === 0 ? 7 : 7 - day;
  const sun = new Date(now);
  sun.setDate(now.getDate() + daysUntilSun);
  sun.setHours(0, 0, 0, 0);
  return sun;
}

export function getNextWeekLabel() {
  const sun = getNextWeekStart();
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${sun.toLocaleDateString("en-US", opts)} – ${sat.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

export function isSaturday() {
  return new Date().getDay() === 6;
}

export function formatPayPeriod() {
  const { start, end } = getWeekBounds(new Date());
  const opts = { month: "short", day: "numeric" };
  const s = start.toLocaleDateString("en-US", opts);
  const e = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `Pay Period: ${s} – ${e}`;
}

export function calcReconStreak(entries) {
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const e of sorted) {
    if (e.recon_missed) break;
    streak++;
  }
  return streak;
}

export const CSV_HEADERS = ["Driver", "Date", "City", "Carpage ID", "Carpage Link", "Pay", "Hours", "Miles", "Actual Cost", "Estimated Cost", "Recon Missed"];

export function buildCSVContent(entries, profiles) {
  const rows = [...entries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(e => {
      const driver = profiles.find(p => p.id === e.driver_id);
      return [
        driver?.name ?? "",
        e.date,
        e.city,
        e.crm_id,
        e.carpage_link ?? "",
        e.pay,
        e.hours,
        e.miles ?? 0,
        e.actual_cost ?? 0,
        e.estimated_cost ?? 0,
        e.recon_missed ? "Yes" : "No",
      ];
    });
  return [CSV_HEADERS, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
}
