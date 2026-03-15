import { describe, it, expect } from "vitest";
import {
  getWeekBounds,
  formatDate,
  formatCurrency,
  buildCSVContent,
  CSV_HEADERS,
  getMonth,
  getNextWeekStart,
  getNextWeekLabel,
  isSaturday,
  formatPayPeriod,
  calcReconStreak,
} from "./utils.js";

// ─── getWeekBounds ────────────────────────────────────────────────────────────
describe("getWeekBounds", () => {
  it("returns a Wednesday start for a Wednesday input", () => {
    const wed = new Date(2025, 0, 8); // Jan 8 2025, local time (Wednesday)
    const { start } = getWeekBounds(wed);
    expect(start.getDay()).toBe(3); // 3 = Wednesday
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0); // January
    expect(start.getDate()).toBe(8);
  });

  it("returns a Tuesday end 6 calendar days after the Wednesday start", () => {
    const wed = new Date(2025, 0, 8);
    const { start, end } = getWeekBounds(wed);
    expect(end.getDay()).toBe(2); // 2 = Tuesday
    expect(end.getDate()).toBe(start.getDate() + 6);
  });

  it("rolls back to the correct Wednesday for a Monday input", () => {
    const mon = new Date(2025, 0, 13); // Jan 13 2025, Monday
    const { start } = getWeekBounds(mon);
    expect(start.getDay()).toBe(3);
    expect(start.getDate()).toBe(8); // previous Wednesday
  });

  it("rolls back to the correct Wednesday for a Sunday input", () => {
    const sun = new Date(2025, 0, 12); // Jan 12 2025, Sunday
    const { start } = getWeekBounds(sun);
    expect(start.getDay()).toBe(3);
    expect(start.getDate()).toBe(8); // Wednesday Jan 8
  });

  it("stays on the same Wednesday for a Saturday input", () => {
    const sat = new Date(2025, 0, 11); // Jan 11 2025, Saturday
    const { start } = getWeekBounds(sat);
    expect(start.getDay()).toBe(3);
    expect(start.getDate()).toBe(8); // Wednesday Jan 8
  });

  it("sets start time to midnight", () => {
    const { start } = getWeekBounds(new Date("2025-01-08"));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });

  it("sets end time to 23:59:59", () => {
    const { end } = getWeekBounds(new Date("2025-01-08"));
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it("uses today when called with no argument", () => {
    const { start, end } = getWeekBounds();
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(start.getDay()).toBe(3); // always a Wednesday
    expect(end.getDay()).toBe(2);   // always a Tuesday
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────
describe("formatDate", () => {
  it("converts YYYY-MM-DD to MM/DD/YYYY", () => {
    expect(formatDate("2025-03-14")).toBe("03/14/2025");
  });

  it("handles single-digit month and day", () => {
    expect(formatDate("2025-01-05")).toBe("01/05/2025");
  });

  it("handles end-of-year dates", () => {
    expect(formatDate("2024-12-31")).toBe("12/31/2024");
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────
describe("formatCurrency", () => {
  it("formats a whole number with two decimal places", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("formats a decimal amount correctly", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a string number", () => {
    expect(formatCurrency("500")).toBe("$500.00");
  });

  it("adds thousands separator", () => {
    expect(formatCurrency(10000)).toBe("$10,000.00");
  });
});

// ─── getMonth ─────────────────────────────────────────────────────────────────
describe("getMonth", () => {
  it("extracts YYYY-MM from a full date string", () => {
    expect(getMonth("2025-03-14")).toBe("2025-03");
  });

  it("works for January", () => {
    expect(getMonth("2025-01-01")).toBe("2025-01");
  });

  it("works for December", () => {
    expect(getMonth("2024-12-31")).toBe("2024-12");
  });
});

// ─── calcReconStreak ──────────────────────────────────────────────────────────
describe("calcReconStreak", () => {
  it("returns 0 for an empty array", () => {
    expect(calcReconStreak([])).toBe(0);
  });

  it("returns 0 when the most recent entry has recon_missed", () => {
    const entries = [
      { date: "2025-03-10", recon_missed: true },
      { date: "2025-03-09", recon_missed: false },
    ];
    expect(calcReconStreak(entries)).toBe(0);
  });

  it("counts consecutive non-missed entries from most recent", () => {
    const entries = [
      { date: "2025-03-12", recon_missed: false },
      { date: "2025-03-11", recon_missed: false },
      { date: "2025-03-10", recon_missed: true },
      { date: "2025-03-09", recon_missed: false },
    ];
    expect(calcReconStreak(entries)).toBe(2);
  });

  it("returns full length when no entries are missed", () => {
    const entries = [
      { date: "2025-03-12", recon_missed: false },
      { date: "2025-03-11", recon_missed: false },
      { date: "2025-03-10", recon_missed: false },
    ];
    expect(calcReconStreak(entries)).toBe(3);
  });

  it("sorts entries by date before counting (handles unsorted input)", () => {
    const entries = [
      { date: "2025-03-10", recon_missed: true },  // oldest
      { date: "2025-03-12", recon_missed: false },  // newest
      { date: "2025-03-11", recon_missed: false },
    ];
    // newest two are fine, oldest is missed → streak = 2
    expect(calcReconStreak(entries)).toBe(2);
  });
});

// ─── date-dependent helpers (shape tests) ─────────────────────────────────────
describe("getNextWeekStart", () => {
  it("returns a Date that is a Sunday", () => {
    const result = getNextWeekStart();
    expect(result).toBeInstanceOf(Date);
    expect(result.getDay()).toBe(0); // 0 = Sunday
  });

  it("returns a date in the future", () => {
    const result = getNextWeekStart();
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });

  it("has time set to midnight", () => {
    const result = getNextWeekStart();
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("getNextWeekLabel", () => {
  it("returns a non-empty string", () => {
    expect(typeof getNextWeekLabel()).toBe("string");
    expect(getNextWeekLabel().length).toBeGreaterThan(0);
  });

  it("contains an em dash separator", () => {
    expect(getNextWeekLabel()).toContain("–");
  });

  it("contains a 4-digit year", () => {
    expect(getNextWeekLabel()).toMatch(/\d{4}/);
  });
});

describe("isSaturday", () => {
  it("returns a boolean", () => {
    expect(typeof isSaturday()).toBe("boolean");
  });
});

describe("formatPayPeriod", () => {
  it("starts with 'Pay Period:'", () => {
    expect(formatPayPeriod()).toMatch(/^Pay Period:/);
  });

  it("contains an em dash separator", () => {
    expect(formatPayPeriod()).toContain("–");
  });

  it("contains a 4-digit year", () => {
    expect(formatPayPeriod()).toMatch(/\d{4}/);
  });
});

// ─── buildCSVContent ──────────────────────────────────────────────────────────
describe("buildCSVContent", () => {
  const profiles = [
    { id: "d1", name: "Alice" },
    { id: "d2", name: "Bob" },
  ];

  const entries = [
    {
      driver_id: "d1", date: "2025-03-10", city: "Nashville", crm_id: "CRM-001",
      carpage_link: "https://example.com/1", pay: 120, hours: 3, miles: 45,
      actual_cost: 30, estimated_cost: 25, recon_missed: false,
    },
    {
      driver_id: "d2", date: "2025-03-08", city: "Memphis", crm_id: "CRM-002",
      carpage_link: null, pay: 95, hours: 2, miles: null,
      actual_cost: null, estimated_cost: null, recon_missed: true,
    },
  ];

  it("first line is the header row", () => {
    const csv = buildCSVContent(entries, profiles);
    const firstLine = csv.split("\n")[0];
    CSV_HEADERS.forEach(h => expect(firstLine).toContain(h));
  });

  it("includes all entries as rows (header + one per entry)", () => {
    const lines = buildCSVContent(entries, profiles).split("\n");
    expect(lines).toHaveLength(entries.length + 1);
  });

  it("sorts entries newest-first", () => {
    const lines = buildCSVContent(entries, profiles).split("\n");
    // Mar 10 row should come before Mar 8 row
    expect(lines[1]).toContain("2025-03-10");
    expect(lines[2]).toContain("2025-03-08");
  });

  it("resolves driver name from profiles", () => {
    const csv = buildCSVContent(entries, profiles);
    expect(csv).toContain('"Alice"');
    expect(csv).toContain('"Bob"');
  });

  it("uses empty string for unknown driver", () => {
    const orphanEntry = [{ ...entries[0], driver_id: "unknown" }];
    const lines = buildCSVContent(orphanEntry, profiles).split("\n");
    expect(lines[1].startsWith('""')).toBe(true);
  });

  it("formats recon_missed as Yes/No", () => {
    const csv = buildCSVContent(entries, profiles);
    expect(csv).toContain('"No"');
    expect(csv).toContain('"Yes"');
  });

  it("defaults null miles/costs to 0", () => {
    const lines = buildCSVContent(entries, profiles).split("\n");
    // Bob's row (index 2) has null miles, actual_cost, estimated_cost
    expect(lines[2]).toContain('"0"');
  });

  it("defaults null carpage_link to empty string", () => {
    const lines = buildCSVContent(entries, profiles).split("\n");
    // Bob has null carpage_link — should be ""
    const bobRow = lines[2];
    // carpage_link is the 5th column (index 4), check it's present as ""
    expect(bobRow).toContain('""');
  });

  it("wraps every value in double quotes", () => {
    const lines = buildCSVContent(entries, profiles).split("\n");
    lines.forEach(line => {
      line.split(",").forEach(cell => {
        expect(cell.startsWith('"')).toBe(true);
        expect(cell.endsWith('"')).toBe(true);
      });
    });
  });
});
