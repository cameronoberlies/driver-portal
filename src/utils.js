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

// ─── CARPAGE HELPERS ──────────────────────────────────────────────────────────

export function parseCarpageCity(address) {
  const match = address.match(/([A-Za-z\s]+),\s*([A-Za-z]{2})\s*\d{5}/);
  return match ? `${match[1].trim()}, ${match[2].toUpperCase()}` : "";
}

export function buildCarpageNotes({ sellerName, sellerPhone, place, address, note, vin, boughtPrice }) {
  const parts = [];
  if (sellerName) parts.push(`Seller: ${sellerName}`);
  if (sellerPhone) parts.push(`Phone: ${sellerPhone}`);
  if (place) parts.push(`Place: ${place}`);
  if (address) parts.push(`Address: ${address}`);
  if (note) parts.push(`Note: ${note}`);
  if (vin) parts.push(`VIN: ${vin}`);
  if (boughtPrice) parts.push(`Bought for: ${boughtPrice}`);
  return parts.join(" | ");
}

export function parseCarpagePickup(timeText) {
  if (!timeText) return "";
  const parsed = new Date(timeText);
  if (isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

// ─── TRIP HELPERS ─────────────────────────────────────────────────────────────

export function validateTripForm(form) {
  if (!form.driver_id || !form.city || !form.crm_id || !form.scheduled_pickup) {
    return "Driver, city, CRM ID and pickup time are required.";
  }
  if (form.trip_type === "drive" && !form.second_driver_id) {
    return "Drive trips require a second driver.";
  }
  if (form.trip_type === "drive" && form.second_driver_id === form.driver_id) {
    return "Primary and second driver must be different.";
  }
  return null;
}

export function buildTripPayload(form) {
  return {
    driver_id: form.driver_id,
    trip_type: form.trip_type,
    city: form.city,
    crm_id: form.crm_id,
    carpage_link: form.carpage_link || null,
    scheduled_pickup: new Date(form.scheduled_pickup).toISOString(),
    notes: form.notes || null,
    status: "pending",
    second_driver_id: form.trip_type === "drive" ? form.second_driver_id : null,
    designated_driver_id: form.trip_type === "drive"
      ? form.designated_driver_id || form.driver_id
      : form.driver_id,
  };
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
