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

// ─── TRIP TYPE HELPERS ────────────────────────────────────────────────────────

const TRIP_TYPE_LABELS = {
  fly: "✈ Fly",
  drive: "🚗 Drive",
  aa: "🚐 AA",
  courier: "📦 Courier",
  airport: "🛫 Airport",
};

export function tripTypeLabel(type) {
  return TRIP_TYPE_LABELS[type] || type;
}

export function aaGroupLabel(trip) {
  const d = trip.scheduled_pickup ? new Date(trip.scheduled_pickup) : new Date();
  return `AA ${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── TRIP HELPERS ─────────────────────────────────────────────────────────────

export function validateTripForm(form) {
  if (form.trip_type === "aa") {
    if (!form.aa_driver_ids || form.aa_driver_ids.length === 0) {
      return "AA trips require at least one driver.";
    }
    if (!form.city) {
      return "Destination city is required for AA trips.";
    }
    return null;
  }
  if (!form.driver_id || !form.scheduled_pickup) {
    return "Driver and pickup time are required.";
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
  const base = {
    trip_type: form.trip_type,
    city: form.city,
    crm_id: form.crm_id,
    carpage_link: form.carpage_link || null,
    scheduled_pickup: new Date(form.scheduled_pickup).toISOString(),
    notes: form.notes || null,
    destination_address: form.destination_address || null,
    dealer_plate: form.dealer_plate || null,
    status: "pending",
  };

  if (form.trip_type === "drive") {
    return {
      ...base,
      chase_vehicle_stock: form.chase_vehicle_stock || null,
      driver_id: form.driver_id,
      second_driver_id: form.second_driver_id,
      designated_driver_id: form.designated_driver_id || form.driver_id,
    };
  }

  if (form.trip_type === "courier") {
    return {
      ...base,
      driver_id: form.driver_id,
      designated_driver_id: form.driver_id,
    };
  }

  // fly (and airport — created separately via createAirportDriverTrip)
  return {
    ...base,
    driver_id: form.driver_id,
    designated_driver_id: form.driver_id,
  };
}

export const CSV_HEADERS = [
  "Driver", "Date", "City", "Trip Type", "Carpage ID", "Carpage Link",
  "Pay", "Hours", "Miles",
  "Flight Ticket", "Rideshare", "Fuel", "Other Expenses", "Actual Cost", "Estimated Cost",
  "Stock Numbers", "Recon Missed", "Turned Down", "Additional Recon Cost",
];

export function buildCSVContent(entries, profiles, canSeePay = true) {
  const headers = canSeePay ? CSV_HEADERS : CSV_HEADERS.filter(h => h !== "Pay");
  const rows = [...entries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(e => {
      const driver = profiles.find(p => p.id === e.driver_id);
      const row = [
        driver?.name ?? "",
        e.date,
        e.city,
        e.trip_type ?? "",
        e.crm_id,
        e.carpage_link ?? "",
        ...(canSeePay ? [e.pay] : []),
        e.hours,
        e.miles ?? 0,
        e.flight_cost ?? "",
        e.rideshare_cost ?? "",
        e.fuel_cost ?? "",
        e.other_cost ?? "",
        e.actual_cost ?? 0,
        e.estimated_cost ?? 0,
        e.stock_numbers ?? "",
        e.recon_missed ? "Yes" : "No",
        e.turned_down ? "Yes" : "No",
        e.additional_recon_cost ?? "",
      ];
      return row;
    });
  return [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
}
