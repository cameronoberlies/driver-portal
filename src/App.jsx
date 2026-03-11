import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://yincjogkjvotupzgetqg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las"
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getWeekBounds(date = new Date()) {
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

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function formatCurrency(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function getMonth(dateStr) { return dateStr.slice(0, 7); }

// Returns the upcoming Sunday (start of next availability week)
function getNextWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSun = day === 0 ? 7 : 7 - day;
  const sun = new Date(now);
  sun.setDate(now.getDate() + daysUntilSun);
  sun.setHours(0, 0, 0, 0);
  return sun;
}

function getNextWeekLabel() {
  const sun = getNextWeekStart();
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${sun.toLocaleDateString("en-US", opts)} – ${sat.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function isSaturday() {
  return new Date().getDay() === 6;
}

function formatPayPeriod() {
  const { start, end } = getWeekBounds(new Date());
  const opts = { month: "short", day: "numeric" };
  const s = start.toLocaleDateString("en-US", opts);
  const e = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `Pay Period: ${s} – ${e}`;
}

function PayPeriodBanner() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)",
      borderRadius: 6, padding: "6px 14px", marginBottom: 20,
      fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
      textTransform: "uppercase", color: "var(--accent)"
    }}>
      <span style={{ fontSize: 14 }}>📅</span> {formatPayPeriod()}
    </div>
  );
}

function calcReconStreak(entries) {
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const e of sorted) {
    if (e.recon_missed) break;
    streak++;
  }
  return streak;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0f12;
    --surface: #161a20;
    --border: #2a3140;
    --accent: #e8b44a;
    --accent2: #3b8cf7;
    --danger: #e85a4a;
    --success: #4ae885;
    --text: #e8ecf0;
    --muted: #6b7585;
    --font-head: 'Barlow Condensed', sans-serif;
    --font-body: 'Barlow', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, var(--border) 39px, var(--border) 40px),
                      repeating-linear-gradient(90deg, transparent, transparent 39px, var(--border) 39px, var(--border) 40px);
  }
  .login-card {
    background: var(--surface); border: 1px solid var(--border); width: 380px;
    padding: 40px; position: relative; box-shadow: 0 0 60px rgba(0,0,0,0.5);
    animation: fadeUp 0.4s ease;
  }
  .login-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
  }
  .login-logo { font-family: var(--font-head); font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .login-sub { color: var(--muted); font-size: 13px; margin-bottom: 32px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .field input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
    padding: 10px 14px; font-family: var(--font-body); font-size: 14px;
    outline: none; transition: border-color 0.2s;
  }
  .field input:focus { border-color: var(--accent); }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 20px; font-family: var(--font-head); font-size: 14px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; border: none;
    transition: all 0.15s; white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: #0d0f12; }
  .btn-primary:hover { background: #f5c55a; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .btn-block { width: 100%; }
  .error-msg { color: var(--danger); font-size: 13px; margin-top: 12px; text-align: center; }

  .topbar {
    background: var(--surface); border-bottom: 1px solid var(--border);
    padding: 0 32px; height: 58px; display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
  }
  .topbar-logo { font-family: var(--font-head); font-size: 22px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; }
  .topbar-logo span { color: var(--accent); }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .topbar-user { font-size: 13px; color: var(--muted); }
  .topbar-user strong { color: var(--text); }

  .page { padding: 32px; max-width: 1100px; margin: 0 auto; }
  .page-title { font-family: var(--font-head); font-size: 36px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .page-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border); padding: 20px;
    position: relative; overflow: hidden; animation: fadeUp 0.3s ease both;
  }
  .stat-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
    background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease;
  }
  .stat-card:hover::after { transform: scaleX(1); }
  .stat-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .stat-value { font-family: var(--font-head); font-size: 32px; font-weight: 800; line-height: 1; }
  .stat-value.accent { color: var(--accent); }
  .stat-value.success { color: var(--success); }
  .stat-value.blue { color: var(--accent2); }
  .stat-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }

  .bonus-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
  .bonus-card { background: var(--surface); border: 1px solid var(--border); padding: 20px; }
  .bonus-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .bonus-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
  .bonus-earned { font-size: 11px; font-weight: 700; background: var(--success); color: #0d0f12; padding: 2px 8px; }
  .progress-bar { background: var(--bg); height: 8px; }
  .progress-fill { height: 100%; transition: width 0.6s ease; }
  .progress-fill.trips { background: linear-gradient(90deg, var(--accent2), var(--accent)); }
  .progress-fill.recon { background: linear-gradient(90deg, var(--success), #3bf890); }
  .bonus-count { font-family: var(--font-head); font-size: 28px; font-weight: 800; margin-top: 8px; }
  .bonus-desc { font-size: 12px; color: var(--muted); margin-top: 4px; }

  .table-wrap { background: var(--surface); border: 1px solid var(--border); overflow: hidden; margin-bottom: 32px; overflow-x: auto; }
  .table-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .table-head-title { font-family: var(--font-head); font-size: 16px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); padding: 12px 20px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
  td { padding: 12px 20px; font-size: 14px; border-bottom: 1px solid rgba(42,49,64,0.5); white-space: nowrap; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); }
  .badge { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .badge-ok { background: rgba(74,232,133,0.15); color: var(--success); }
  .badge-miss { background: rgba(232,90,74,0.15); color: var(--danger); }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200;
    display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border); width: 480px; max-width: 95vw;
    padding: 28px; position: relative; box-shadow: 0 0 80px rgba(0,0,0,0.6); animation: fadeUp 0.2s ease;
  }
  .modal::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
  }
  .modal-title { font-family: var(--font-head); font-size: 20px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
  .modal-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
  .btn-edit { background: transparent; color: var(--accent2); border: 1px solid var(--accent2); padding: 4px 10px; font-family: var(--font-head); font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.15s; }
  .btn-edit:hover { background: var(--accent2); color: #0d0f12; }

  .report-section { background: var(--surface); border: 1px solid var(--border); padding: 24px; margin-bottom: 24px; }
  .report-title { font-family: var(--font-head); font-size: 20px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .report-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(42,49,64,0.4); font-size: 14px; flex-wrap: wrap; gap: 8px; }
  .report-row:last-child { border-bottom: none; }
  .report-total { display: flex; justify-content: space-between; padding: 12px 0 0; font-family: var(--font-head); font-size: 20px; font-weight: 700; color: var(--accent); }

  .tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid var(--border); overflow-x: auto; }
  .tab { padding: 12px 20px; font-family: var(--font-head); font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; background: none; border-top: none; border-left: none; border-right: none; white-space: nowrap; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-card { background: var(--surface); border: 1px solid var(--border); padding: 28px; margin-bottom: 32px; }
  .form-card-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
  .field select {
    width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
    padding: 10px 14px; font-family: var(--font-body); font-size: 14px;
    outline: none; transition: border-color 0.2s; appearance: none;
  }
  .field select:focus { border-color: var(--accent); }
  .checkbox-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; cursor: pointer; }
  .checkbox-row input[type=checkbox] { width: 16px; height: 16px; accent-color: var(--danger); cursor: pointer; }
  .checkbox-row label { font-size: 14px; cursor: pointer; }
  .success-toast { background: rgba(74,232,133,0.1); border: 1px solid var(--success); color: var(--success); padding: 12px 16px; margin-top: 16px; font-size: 13px; font-weight: 600; animation: fadeUp 0.3s ease; }

  .driver-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .driver-card {
    background: var(--surface); border: 1px solid var(--border); padding: 20px;
    cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  }
  .driver-card:hover { border-color: var(--accent); }
  .driver-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; bottom: 0; background: var(--accent2); }
  .driver-name { font-family: var(--font-head); font-size: 20px; font-weight: 700; letter-spacing: 1px; }
  .driver-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .driver-pay { font-family: var(--font-head); font-size: 28px; font-weight: 800; color: var(--accent); margin-top: 12px; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-in { animation: fadeUp 0.3s ease both; }
  .fade-in-1 { animation-delay: 0.05s; }
  .fade-in-2 { animation-delay: 0.1s; }
  .fade-in-3 { animation-delay: 0.15s; }
  .fade-in-4 { animation-delay: 0.2s; }
  .fade-in-5 { animation-delay: 0.25s; }

  @media (max-width: 640px) {
    .page { padding: 16px; }
    .bonus-section { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .topbar { padding: 0 16px; }
  }
`;

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (!profile) { setError("No profile found. Contact admin."); setLoading(false); return; }
    onLogin({ ...profile, email: data.user.email });
    setLoading(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Driver<span>Pay</span></div>
        <div className="login-sub">Team earnings portal — sign in to continue</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  );
}

// ─── CHANGE PASSWORD MODAL ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    setTimeout(onClose, 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Change Password</div>
        {success ? (
          <div className="success-toast">✓ Password updated successfully!</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" autoFocus />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 12 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 12 }} disabled={loading}>{loading ? "Saving..." : "Update Password →"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ user, onLogout }) {
  const [showChangePw, setShowChangePw] = useState(false);
  return (
    <>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      <div className="topbar">
        <div className="topbar-logo">Driver<span>Pay</span></div>
        <div className="topbar-right">
          <div className="topbar-user">
            Signed in as <strong>{user.name}</strong>
            {user.role === "admin" && <span style={{ color: "var(--accent)", marginLeft: 6, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>ADMIN</span>}
          </div>
          <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setShowChangePw(true)}>Change Password</button>
          <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </>
  );
}

// ─── DRIVER AVAILABILITY ──────────────────────────────────────────────────────
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DriverAvailability({ driver }) {
  const weekStart = getNextWeekStart().toISOString().slice(0, 10);
  const emptyAvail = { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun_done_by: "", mon_done_by: "", tue_done_by: "", wed_done_by: "", thu_done_by: "", fri_done_by: "", sat_done_by: "" };
  const [avail, setAvail] = useState(emptyAvail);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);
  const [loadTrigger, setLoadTrigger] = useState(0);

  const today = new Date().getDay();
  const isSat = today === 6;
  const isAfterSat = !isSat;
  const isAmend = existingRecord && isAfterSat;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("availability").select("*").eq("driver_id", driver.id).eq("week_start", weekStart).maybeSingle();
      if (data) {
        setExistingRecord(data);
        setAvail({ sun: data.sun, mon: data.mon, tue: data.tue, wed: data.wed, thu: data.thu, fri: data.fri, sat: data.sat, sun_done_by: data.sun_done_by ?? "", mon_done_by: data.mon_done_by ?? "", tue_done_by: data.tue_done_by ?? "", wed_done_by: data.wed_done_by ?? "", thu_done_by: data.thu_done_by ?? "", fri_done_by: data.fri_done_by ?? "", sat_done_by: data.sat_done_by ?? "" });
      } else {
        setExistingRecord(null);
        setAvail(emptyAvail);
      }
      setLoading(false);
    }
    load();
  }, [driver.id, weekStart, loadTrigger]);

  async function handleSave() {
    if (isAmend && !reason.trim()) return;
    setSaving(true);
    const payload = {
      driver_id: driver.id,
      week_start: weekStart,
      ...avail,
      updated_after_saturday: isAfterSat ? true : (existingRecord?.updated_after_saturday ?? false),
      update_reason: isAfterSat ? reason.trim() : (existingRecord?.update_reason ?? null),
    };
    DAYS.forEach(d => { if (!avail[d]) payload[`${d}_done_by`] = null; });
    await supabase.from("availability").upsert(payload, { onConflict: "driver_id,week_start" });
    setSaving(false);
    setSaved(true);
    setReason("");
    setLoadTrigger(t => t + 1);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div className="form-card fade-in">
      <div className="form-card-title">Availability — {getNextWeekLabel()}</div>

      {existingRecord && (
        <div style={{ background: "rgba(0,200,100,0.08)", border: "1px solid rgba(0,200,100,0.2)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--success)" }}>
          ✓ You submitted availability for this week on {new Date(existingRecord.submitted_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}.
          {existingRecord.updated_after_saturday && <span style={{ color: "var(--accent)", marginLeft: 6 }}>⚠ Amended after Saturday — Reason: "{existingRecord.update_reason}"</span>}
        </div>
      )}

      {isAmend && (
        <div style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.25)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--accent)" }}>
          ⚠ You are updating your availability after Saturday. Your manager will be notified this was changed and you must provide a reason.
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center", gap: 12 }}>
            <div className="checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" id={`avail-${d}`} checked={avail[d]} onChange={e => setAvail(a => ({ ...a, [d]: e.target.checked }))} />
              <label htmlFor={`avail-${d}`} style={{ fontSize: 14, fontWeight: 600 }}>{DAY_LABELS[i]}</label>
            </div>
            {avail[d] && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>Done by</label>
                <input type="time" value={avail[`${d}_done_by`]} onChange={e => setAvail(a => ({ ...a, [`${d}_done_by`]: e.target.value }))} style={{ width: 120 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {isAmend && (
        <div className="field" style={{ marginTop: 20 }}>
          <label>Reason for change <span style={{ color: "var(--danger)" }}>*</span></label>
          <input type="text" placeholder="e.g. Doctor appointment on Monday" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSave} disabled={saving || (isAmend && !reason.trim())}>
        {saving ? "Saving..." : existingRecord ? "Update Availability →" : "Submit Availability →"}
      </button>
      {saved && <div className="success-toast">✓ Availability {isAmend ? "updated" : "submitted"}!</div>}
    </div>
  );
}

// ─── DRIVER DASHBOARD ─────────────────────────────────────────────────────────
function DriverDashboard({ driver, entries, tab, setTab }) {
  const now = new Date();
  const { start: wkStart, end: wkEnd } = getWeekBounds(now);
  const thisMonth = now.toISOString().slice(0, 7);

  const weekEntries = entries.filter(e => {
    const d = new Date(e.date + "T12:00:00");
    return d >= wkStart && d <= wkEnd;
  });
  const monthEntries = entries.filter(e => getMonth(e.date) === thisMonth);
  const weekPay = weekEntries.reduce((s, e) => s + Number(e.pay), 0);
  const weekHours = weekEntries.reduce((s, e) => s + Number(e.hours), 0);
  const monthTrips = monthEntries.length;
  const allTimeTrips = entries.length;
  const reconStreak = calcReconStreak(entries);
  const weekBonus = monthTrips >= 20 ? 50 : 0;
  const reconBonus = reconStreak >= 25 ? 50 : 0;
  const totalWeekPay = weekPay + weekBonus + reconBonus;

  const wkLabel = `${wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${wkEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const sortedWeek = [...weekEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const sortedMonth = [...monthEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page">
      <div className="page-title fade-in">{driver.role === "admin" ? `Welcome back, ${driver.name.split(" ")[0]}` : `Driver Profile — ${driver.name}`}</div>
      <div className="page-sub fade-in">{driver.role === "admin" ? "Your earnings & trip summary" : `Viewing ${driver.name}'s earnings & trips`}</div>
      <PayPeriodBanner />

      <div className="tabs">
        {["overview", "weekly report", "monthly report", "availability"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="stats-grid">
            {[
              { label: "This Week's Pay", value: formatCurrency(weekPay), cls: "accent", sub: wkLabel },
              { label: "Total w/ Bonuses", value: formatCurrency(totalWeekPay), cls: "success", sub: weekBonus + reconBonus > 0 ? `+$${weekBonus + reconBonus} in bonuses!` : "No bonuses yet" },
              { label: "Hours This Week", value: weekHours + "h", cls: "", sub: `${weekEntries.length} trip${weekEntries.length !== 1 ? "s" : ""}` },
              { label: "Trips This Month", value: monthTrips, cls: "blue", sub: `All time: ${allTimeTrips}` },
              { label: "Miles This Week", value: weekEntries.reduce((s, e) => s + Number(e.miles ?? 0), 0) + " mi", cls: "", sub: `All time: ${entries.reduce((s, e) => s + Number(e.miles ?? 0), 0)} mi` },
            ].map((s, i) => (
              <div key={i} className={`stat-card fade-in fade-in-${i + 1}`}>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.cls}`}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="bonus-section">
            <div className="bonus-card fade-in fade-in-3">
              <div className="bonus-header">
                <div className="bonus-title">Monthly Trip Bonus</div>
                {monthTrips >= 20 && <div className="bonus-earned">+$50 EARNED</div>}
              </div>
              <div className="progress-bar">
                <div className="progress-fill trips" style={{ width: Math.min(100, (monthTrips / 20) * 100) + "%" }} />
              </div>
              <div className="bonus-count" style={{ color: "var(--accent2)" }}>{monthTrips}<span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 400 }}>/20</span></div>
              <div className="bonus-desc">Reach 20 trips this month for a $50 bonus</div>
            </div>
            <div className="bonus-card fade-in fade-in-4">
              <div className="bonus-header">
                <div className="bonus-title">Clean Recon Streak</div>
                {reconStreak >= 25 && <div className="bonus-earned">+$50 EARNED</div>}
              </div>
              <div className="progress-bar">
                <div className="progress-fill recon" style={{ width: Math.min(100, (reconStreak / 25) * 100) + "%" }} />
              </div>
              <div className="bonus-count" style={{ color: "var(--success)" }}>{reconStreak}<span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 400 }}>/25</span></div>
              <div className="bonus-desc">25 consecutive trips with no missed recon for a $50 bonus</div>
            </div>
          </div>

          <div className="table-wrap fade-in fade-in-4">
            <div className="table-head"><div className="table-head-title">Recent Trips</div></div>
            <table>
              <thead><tr><th>Date</th><th>City</th><th>Carpage ID</th><th>Pay</th><th>Hours</th><th>Recon</th></tr></thead>
              <tbody>
                {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(e => (
                  <tr key={e.id}>
                    <td>{formatDate(e.date)}</td>
                    <td>{e.city}</td>
                    <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{e.crm_id}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>{formatCurrency(e.pay)}</td>
                    <td>{e.hours}h</td>
                    <td><span className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`}>{e.recon_missed ? "MISSED" : "OK"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "weekly report" && (
        <div className="fade-in">
          <div className="report-section">
            <div className="report-title">
              <span>Weekly Report</span>
              <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}>{wkLabel}</span>
            </div>
            {sortedWeek.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14 }}>No trips logged this week yet.</div>}
            {sortedWeek.map(e => (
              <div key={e.id} className="report-row">
                <span>{formatDate(e.date)} — {e.city}</span>
                <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontFamily: "monospace" }}>{e.crm_id}</span>
                  <span>{e.hours}h</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600, minWidth: 70, textAlign: "right" }}>{formatCurrency(e.pay)}</span>
                </span>
              </div>
            ))}
            {weekBonus > 0 && <div className="report-row"><span style={{ color: "var(--success)" }}>Monthly Trip Bonus (20+ trips)</span><span style={{ color: "var(--success)" }}>+$50.00</span></div>}
            {reconBonus > 0 && <div className="report-row"><span style={{ color: "var(--success)" }}>Clean Recon Bonus (25 streak)</span><span style={{ color: "var(--success)" }}>+$50.00</span></div>}
            <div className="report-total"><span>TOTAL</span><span>{formatCurrency(totalWeekPay)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={() => window.print()}>⬇ Download PDF</button>
        </div>
      )}

      {tab === "monthly report" && (
        <div className="fade-in">
          <div className="report-section">
            <div className="report-title">
              <span>Monthly Report</span>
              <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}>{new Date(thisMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
            {sortedMonth.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14 }}>No trips logged this month yet.</div>}
            {sortedMonth.map(e => (
              <div key={e.id} className="report-row">
                <span>{formatDate(e.date)} — {e.city}</span>
                <span style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontFamily: "monospace" }}>{e.crm_id}</span>
                  <span>{e.hours}h</span>
                  <span className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`} style={{ fontSize: 9 }}>{e.recon_missed ? "RECON MISSED" : "RECON OK"}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600, minWidth: 70, textAlign: "right" }}>{formatCurrency(e.pay)}</span>
                </span>
              </div>
            ))}
            {weekBonus > 0 && <div className="report-row"><span style={{ color: "var(--success)" }}>Monthly Trip Bonus</span><span style={{ color: "var(--success)" }}>+$50.00</span></div>}
            <div className="report-total">
              <span>TOTAL — {monthTrips} TRIPS</span>
              <span>{formatCurrency(monthEntries.reduce((s, e) => s + Number(e.pay), 0) + weekBonus)}</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => window.print()}>⬇ Download PDF</button>
        </div>
      )}

      {tab === "availability" && (
        <DriverAvailability driver={driver} />
      )}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditEntryModal({ entry, drivers, onSave, onClose }) {
  const [form, setForm] = useState({ ...entry, pay: String(entry.pay), hours: String(entry.hours), miles: String(entry.miles ?? 0), actual_cost: String(entry.actual_cost ?? 0), estimated_cost: String(entry.estimated_cost ?? 0), carpage_link: entry.carpage_link ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("entries").update({
      driver_id: form.driver_id,
      date: form.date,
      pay: Number(form.pay),
      hours: Number(form.hours),
      miles: Number(form.miles),
      actual_cost: Number(form.actual_cost),
      estimated_cost: Number(form.estimated_cost),
      carpage_link: form.carpage_link || null,
      city: form.city,
      crm_id: form.crm_id,
      recon_missed: form.recon_missed,
    }).eq("id", form.id);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave({ ...form, pay: Number(form.pay), hours: Number(form.hours), miles: Number(form.miles), actual_cost: Number(form.actual_cost), estimated_cost: Number(form.estimated_cost), carpage_link: form.carpage_link || null });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Edit Entry</div>
        <div className="form-grid">
          <div className="field">
            <label>Driver</label>
            <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="field">
            <label>Pay Amount ($)</label>
            <input type="number" value={form.pay} onChange={e => setForm(f => ({ ...f, pay: e.target.value }))} />
          </div>
          <div className="field">
            <label>Hours Worked</label>
            <input type="number" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
          </div>
          <div className="field">
            <label>Miles Driven</label>
            <input type="number" value={form.miles} onChange={e => setForm(f => ({ ...f, miles: e.target.value }))} />
          </div>
          <div className="field">
            <label>Actual Cost ($)</label>
            <input type="number" value={form.actual_cost} onChange={e => setForm(f => ({ ...f, actual_cost: e.target.value }))} />
          </div>
          <div className="field">
            <label>Estimated Cost ($)</label>
            <input type="number" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
          </div>
          <div className="field">
            <label>City</label>
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="field">
            <label>Carpage ID</label>
            <input type="text" value={form.crm_id} onChange={e => setForm(f => ({ ...f, crm_id: e.target.value }))} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Carpage Link</label>
            <input type="url" placeholder="https://..." value={form.carpage_link} onChange={e => setForm(f => ({ ...f, carpage_link: e.target.value }))} />
          </div>
        </div>
        <div className="checkbox-row" style={{ marginTop: 8 }}>
          <input type="checkbox" id="edit-recon" checked={form.recon_missed} onChange={e => setForm(f => ({ ...f, recon_missed: e.target.checked }))} />
          <label htmlFor="edit-recon" style={{ color: form.recon_missed ? "var(--danger)" : "var(--text)" }}>Recon was missed on this vehicle</label>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 12 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 12 }} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV EXPORT HELPER ────────────────────────────────────────────────────────
function exportCSV(entries, profiles) {
  const headers = ["Driver", "Date", "City", "Carpage ID", "Carpage Link", "Pay", "Hours", "Miles", "Actual Cost", "Estimated Cost", "Recon Missed"];
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
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `driverpay-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── MILEAGE COST REPORT ──────────────────────────────────────────────────────
function MileageCostReport({ entries, drivers, allProfiles, thisMonth, wkStart, wkEnd }) {
  const [reportType, setReportType] = useState("weekly");
  const [selectedDriver, setSelectedDriver] = useState("all");

  const filtered = entries.filter(e => {
    const inPeriod = reportType === "weekly"
      ? (() => { const d = new Date(e.date + "T12:00:00"); return d >= wkStart && d <= wkEnd; })()
      : getMonth(e.date) === thisMonth;
    const inDriver = selectedDriver === "all" || e.driver_id === selectedDriver;
    return inPeriod && inDriver;
  });

  const totalActual = filtered.reduce((s, e) => s + Number(e.actual_cost ?? 0), 0);
  const totalEstimated = filtered.reduce((s, e) => s + Number(e.estimated_cost ?? 0), 0);
  const totalMiles = filtered.reduce((s, e) => s + Number(e.miles ?? 0), 0);
  const variance = totalActual - totalEstimated;

  const periodLabel = reportType === "weekly"
    ? `${wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${wkEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : new Date(thisMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="fade-in">
      {/* Controls */}
      <div className="form-card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Period</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Driver</label>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
              <option value="all">All Drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 12 }} onClick={() => exportCSV(filtered, allProfiles)}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Miles", value: totalMiles + " mi", cls: "", sub: periodLabel },
          { label: "Total Actual Cost", value: formatCurrency(totalActual), cls: "danger", sub: `${filtered.length} trips` },
          { label: "Total Estimated Cost", value: formatCurrency(totalEstimated), cls: "blue", sub: `${filtered.length} trips` },
          { label: "Variance", value: (variance >= 0 ? "+" : "") + formatCurrency(variance), cls: variance > 0 ? "danger" : "success", sub: variance > 0 ? "Over estimate" : variance < 0 ? "Under estimate" : "On target" },
        ].map((s, i) => (
          <div key={i} className={`stat-card fade-in fade-in-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Per-driver breakdown */}
      <div className="table-wrap">
        <div className="table-head">
          <div className="table-head-title">Cost Breakdown by Trip</div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{filtered.length} trips</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>No entries with cost data for this period.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Date</th>
                <th>City</th>
                <th>Miles</th>
                <th>Actual Cost</th>
                <th>Estimated Cost</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                const driver = allProfiles.find(u => u.id === e.driver_id);
                const v = Number(e.actual_cost ?? 0) - Number(e.estimated_cost ?? 0);
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{driver?.name ?? "—"}</td>
                    <td>{formatDate(e.date)}</td>
                    <td>{e.city}</td>
                    <td style={{ color: "var(--muted)" }}>{e.miles ?? 0} mi</td>
                    <td style={{ color: "var(--danger)", fontWeight: 600 }}>{formatCurrency(e.actual_cost ?? 0)}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>{formatCurrency(e.estimated_cost ?? 0)}</td>
                    <td style={{ color: v > 0 ? "var(--danger)" : v < 0 ? "var(--success)" : "var(--muted)", fontWeight: 600 }}>
                      {v >= 0 ? "+" : ""}{formatCurrency(v)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── LIVE DRIVERS MAP ─────────────────────────────────────────────────────────
function LiveDriversMap({ drivers }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else if (window.L) {
      initMap();
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  function initMap() {
  if (!mapRef.current || mapInstanceRef.current) return;
  const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([36.0, -80.0], 6);
  map.scrollWheelZoom.disable();
  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
  }).addTo(map);
  mapInstanceRef.current = map;
  fetchLocations(map);
}

  async function fetchLocations(map) {
    setLoading(true);
    const { data } = await supabase.from("driver_locations").select("*");
    setLocations(data ?? []);
    setLastRefresh(new Date());
    updateMarkers(data ?? [], map);
    setLoading(false);
  }

  function updateMarkers(locs, map) {
    if (!map || !window.L) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    if (locs.length === 0) return;

    const bounds = [];
    locs.forEach(loc => {
      const driver = drivers.find(d => d.id === loc.driver_id);
      const name = driver?.name ?? "Unknown Driver";
      const age = Math.floor((new Date() - new Date(loc.updated_at)) / 1000);
      const ageLabel = age < 60 ? `${age}s ago` : age < 3600 ? `${Math.floor(age / 60)}m ago` : `${Math.floor(age / 3600)}h ago`;
      const isRecent = age < 120; // green if updated within 2 min

      const icon = window.L.divIcon({
        className: "",
        html: `
          <div style="
            background: ${isRecent ? "#4ae885" : "#f5a623"};
            border: 2px solid #0d0f12;
            border-radius: 50%;
            width: 14px;
            height: 14px;
            box-shadow: 0 0 ${isRecent ? "8px #4ae885" : "6px #f5a623"};
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = window.L.marker([loc.latitude, loc.longitude], { icon })
        .bindPopup(`
          <div style="font-family: 'Barlow Condensed', sans-serif; min-width: 140px; background: #161a20; color: #e8ecf0; border: none;">
            <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 11px; color: #6b7585; letter-spacing: 1px;">LAST UPDATE</div>
            <div style="font-size: 13px; font-weight: 600; color: ${isRecent ? "#4ae885" : "#f5a623"};">${ageLabel}</div>
            <div style="font-size: 10px; color: #444; margin-top: 6px;">${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</div>
          </div>
        `, {
          className: "dark-popup"
        })
        .addTo(map);

      markersRef.current[loc.driver_id] = marker;
      bounds.push([loc.latitude, loc.longitude]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    }
  }

  function handleRefresh() {
    if (mapInstanceRef.current) fetchLocations(mapInstanceRef.current);
  }

  const activeLocs = locations.filter(l => {
    const age = (new Date() - new Date(l.updated_at)) / 1000;
    return age < 300; // active within 5 min
  });

  return (
    <div className="fade-in">
      <style>{`
        .leaflet-popup-content-wrapper { background: #161a20 !important; border: 1px solid #2a3140 !important; border-radius: 0 !important; box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important; }
        .leaflet-popup-tip { background: #161a20 !important; }
        .leaflet-popup-content { margin: 12px 16px !important; }
        .leaflet-container { background: #0d0f12; }
      `}</style>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ae885", boxShadow: "0 0 6px #4ae885" }} />
            <span style={{ fontSize: 12, color: "#4ae885", fontWeight: 700, letterSpacing: 1 }}>{activeLocs.length} ACTIVE</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {locations.length === 0
              ? "No drivers currently driving"
              : `${locations.length} driver${locations.length !== 1 ? "s" : ""} tracked`}
          </div>
          <div style={{ fontSize: 11, color: "#444" }}>Last refresh: {lastRefresh.toLocaleTimeString()}</div>
        </div>
        <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={handleRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Driver status pills */}
      {locations.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {locations.map(loc => {
            const driver = drivers.find(d => d.id === loc.driver_id);
            const age = Math.floor((new Date() - new Date(loc.updated_at)) / 1000);
            const isRecent = age < 120;
            const ageLabel = age < 60 ? `${age}s ago` : age < 3600 ? `${Math.floor(age / 60)}m ago` : `${Math.floor(age / 3600)}h ago`;
            return (
              <div key={loc.driver_id} style={{
                background: "var(--surface)", border: `1px solid ${isRecent ? "rgba(74,232,133,0.3)" : "var(--border)"}`,
                borderRadius: 4, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: isRecent ? "#4ae885" : "#f5a623" }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{driver?.name ?? "Unknown"}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{ageLabel}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Map */}
      <div style={{ position: "relative", borderRadius: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div ref={mapRef} style={{ height: 500, width: "100%", background: "#0d0f12" }} />
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(13,15,18,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, letterSpacing: 2, color: "var(--muted)", fontWeight: 700
          }}>
            LOADING MAP...
          </div>
        )}
        {!loading && locations.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8
          }}>
            <div style={{ fontSize: 32, opacity: 0.2 }}>🚗</div>
            <div style={{ fontSize: 13, letterSpacing: 2, color: "var(--muted)", fontWeight: 700 }}>NO ACTIVE DRIVERS</div>
            <div style={{ fontSize: 12, color: "#333" }}>Drivers appear here when a trip is in progress</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ae885", boxShadow: "0 0 5px #4ae885" }} />
          <span>Updated &lt; 2 min ago</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f5a623", boxShadow: "0 0 5px #f5a623" }} />
          <span>Updated &gt; 2 min ago</span>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ allProfiles, entries, setEntries }) {
  const drivers = allProfiles.filter(u => u.role === "driver");
  const [tab, setTab] = useState("overview");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverTab, setDriverTab] = useState("overview");
  const [editingEntry, setEditingEntry] = useState(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterDriver, setFilterDriver] = useState("all");
  const [filterCity, setFilterCity] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const now = new Date();
  const { start: wkStart, end: wkEnd } = getWeekBounds(now);
  const thisMonth = now.toISOString().slice(0, 7);

  const [form, setForm] = useState({
    driver_id: drivers[0]?.id || "",
    date: now.toISOString().slice(0, 10),
    pay: "", hours: "", miles: "", actual_cost: "", estimated_cost: "", city: "", crm_id: "", carpage_link: "", recon_missed: false,
  });

  useEffect(() => {
    if (drivers.length > 0 && !form.driver_id) {
      setForm(f => ({ ...f, driver_id: drivers[0].id }));
    }
  }, [drivers.length]);

  async function handleSubmit() {
    if (!form.pay || !form.hours || !form.city || !form.crm_id || !form.driver_id) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("entries").insert({
      driver_id: form.driver_id,
      date: form.date,
      pay: Number(form.pay),
      hours: Number(form.hours),
      miles: form.miles ? Number(form.miles) : 0,
      actual_cost: form.actual_cost ? Number(form.actual_cost) : 0,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
      city: form.city,
      crm_id: form.crm_id,
      carpage_link: form.carpage_link || null,
      recon_missed: form.recon_missed,
    }).select().single();
    if (!error && data) {
      setEntries(prev => [...prev, data]);
      setForm(f => ({ ...f, pay: "", hours: "", miles: "", actual_cost: "", estimated_cost: "", city: "", crm_id: "", carpage_link: "", recon_missed: false }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSubmitting(false);
  }

  function handleSaveEdit(updated) {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingEntry(null);
  }

  // Filtered entries
  const filteredEntries = entries.filter(e => {
    if (filterDriver !== "all" && e.driver_id !== filterDriver) return false;
    if (filterCity && !e.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterFrom && e.date < filterFrom) return false;
    if (filterTo && e.date > filterTo) return false;
    return true;
  });

  const uniqueCities = [...new Set(entries.map(e => e.city))].sort();

  if (selectedDriver) {
    const driverEntries = entries.filter(e => e.driver_id === selectedDriver.id);
    return (
      <div className="page">
        <button className="btn btn-ghost" style={{ marginBottom: 20, padding: "6px 14px", fontSize: 12 }} onClick={() => setSelectedDriver(null)}>← All Drivers</button>
        <DriverDashboard driver={selectedDriver} entries={driverEntries} tab={driverTab} setTab={setDriverTab} />
      </div>
    );
  }

  return (
    <div className="page">
      {editingEntry && <EditEntryModal entry={editingEntry} drivers={allProfiles} onSave={handleSaveEdit} onClose={() => setEditingEntry(null)} />}

      <div className="page-title fade-in">Admin Dashboard</div>
      <div className="page-sub fade-in">Manage driver entries and view all accounts</div>
      <PayPeriodBanner />

      <div className="tabs">
        {["overview", "log entry", "all entries", "mileage costs", "availability", "live drivers", "downloads"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
            This Week's Earnings — Click any driver to view full dashboard
          </div>
          {drivers.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 14, padding: "24px 0" }}>
              No drivers added yet. Add driver accounts in Supabase Auth, then insert them into the profiles table with <code style={{ background: "var(--bg)", padding: "1px 6px" }}>role = 'driver'</code>.
            </div>
          )}
          <div className="driver-grid">
            {drivers.map((d, i) => {
              const driverEntries = entries.filter(e => e.driver_id === d.id);
              const weekEntries = driverEntries.filter(e => { const dt = new Date(e.date + "T12:00:00"); return dt >= wkStart && dt <= wkEnd; });
              const weekPay = weekEntries.reduce((s, e) => s + Number(e.pay), 0);
              const monthTrips = driverEntries.filter(e => getMonth(e.date) === thisMonth).length;
              return (
                <div key={d.id} className={`driver-card fade-in fade-in-${Math.min(i + 1, 5)}`} onClick={() => { setSelectedDriver(d); setDriverTab("overview"); }}>
                  <div className="driver-name">{d.name}</div>
                  <div className="driver-meta">{weekEntries.length} trips this week · {monthTrips} this month</div>
                  <div className="driver-pay">{formatCurrency(weekPay)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>this week</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "log entry" && (
        <div className="form-card fade-in">
          <div className="form-card-title">Log Daily Entry</div>
          {drivers.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>No drivers in the system yet. Add driver profiles first.</div>
          ) : (
            <>
              <div className="form-grid">
                <div className="field">
                  <label>Driver</label>
                  <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Pay Amount ($)</label>
                  <input type="number" placeholder="0.00" value={form.pay} onChange={e => setForm(f => ({ ...f, pay: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Hours Worked</label>
                  <input type="number" placeholder="0" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Miles Driven</label>
                  <input type="number" placeholder="0" value={form.miles} onChange={e => setForm(f => ({ ...f, miles: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Actual Cost ($)</label>
                  <input type="number" placeholder="0.00" value={form.actual_cost} onChange={e => setForm(f => ({ ...f, actual_cost: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Estimated Cost ($)</label>
                  <input type="number" placeholder="0.00" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
                </div>
                <div className="field">
                  <label>City</label>
                  <input type="text" placeholder="Charlotte" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Carpage ID</label>
                  <input type="text" placeholder="CP-XXXX" value={form.crm_id} onChange={e => setForm(f => ({ ...f, crm_id: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Carpage Link</label>
                  <input type="url" placeholder="https://..." value={form.carpage_link} onChange={e => setForm(f => ({ ...f, carpage_link: e.target.value }))} />
                </div>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" id="recon" checked={form.recon_missed} onChange={e => setForm(f => ({ ...f, recon_missed: e.target.checked }))} />
                <label htmlFor="recon" style={{ color: form.recon_missed ? "var(--danger)" : "var(--text)" }}>Recon was missed on this vehicle</label>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : "Save Entry →"}
              </button>
              {saved && <div className="success-toast">✓ Entry saved to database</div>}
            </>
          )}
        </div>
      )}

      {tab === "all entries" && (
        <>
          {/* Filters */}
          <div className="form-card fade-in" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Driver</label>
                <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)}>
                  <option value="all">All Drivers</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>City</label>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                  <option value="">All Cities</option>
                  {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>From</label>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>To</label>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              </div>
              <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 12 }} onClick={() => { setFilterDriver("all"); setFilterCity(""); setFilterFrom(""); setFilterTo(""); }}>
                Clear
              </button>
              <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 12 }} onClick={() => exportCSV(filteredEntries, allProfiles)}>
                ⬇ Export CSV
              </button>
            </div>
          </div>

          <div className="table-wrap fade-in">
            <div className="table-head">
              <div className="table-head-title">All Trip Entries</div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{filteredEntries.length} of {entries.length} entries</span>
            </div>
            <table>
              <thead><tr><th>Driver</th><th>Date</th><th>City</th><th>Carpage ID</th><th>Pay</th><th>Hours</th><th>Miles</th><th>Recon</th><th></th></tr></thead>
              <tbody>
                {[...filteredEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                  const driver = allProfiles.find(u => u.id === e.driver_id);
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{driver?.name ?? "—"}</td>
                      <td>{formatDate(e.date)}</td>
                      <td>{e.city}</td>
                      <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>
                        {e.carpage_link
                          ? <a href={e.carpage_link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>{e.crm_id} ↗</a>
                          : e.crm_id}
                      </td>
                      <td style={{ color: "var(--accent)", fontWeight: 600 }}>{formatCurrency(e.pay)}</td>
                      <td>{e.hours}h</td>
                      <td style={{ color: "var(--muted)" }}>{e.miles ?? 0} mi</td>
                      <td><span className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`}>{e.recon_missed ? "MISSED" : "OK"}</span></td>
                      <td><button className="btn-edit" onClick={() => setEditingEntry(e)}>Edit</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "mileage costs" && (
        <MileageCostReport entries={entries} drivers={drivers} allProfiles={allProfiles} thisMonth={thisMonth} wkStart={wkStart} wkEnd={wkEnd} />
      )}

      {tab === "availability" && (
        <AdminAvailability drivers={drivers} />
      )}
      {tab === "live drivers" && (
        <LiveDriversMap drivers={drivers} />
    )}
      {tab === "downloads" && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 24 }}>
            App Downloads
          </div>
          <a
            href="https://testflight.apple.com/join/YOURCODE"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderLeft: "3px solid #3b8cf7",
              padding: "20px 24px", marginBottom: 12,
              textDecoration: "none", color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>🍎</span>
            <div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>iOS App</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Install via TestFlight</div>
            </div>
          </a>
          <a
            href="/driverportal.apk"
            download
            style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderLeft: "3px solid #4ae885",
              padding: "20px 24px", marginBottom: 12,
              textDecoration: "none", color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>🤖</span>
            <div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>Android App</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Download & install APK</div>
            </div>
          </a>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 16, lineHeight: 1.6 }}>
            Android: after downloading, open the file and allow installation from unknown sources when prompted.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN AVAILABILITY ───────────────────────────────────────────────────────
function AdminAvailability({ drivers }) {
  const weekStart = getNextWeekStart().toISOString().slice(0, 10);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("availability").select("*").eq("week_start", weekStart);
      setRecords(data ?? []);
      setLoading(false);
    }
    load();
  }, [weekStart]);

  const submitted = new Set(records.map(r => r.driver_id));

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
        Week of {getNextWeekLabel()}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
        {submitted.size} of {drivers.length} drivers have submitted availability
      </div>

      {/* Not submitted warning */}
      {drivers.filter(d => !submitted.has(d.id)).length > 0 && (
        <div style={{ background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.25)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--danger)", marginBottom: 8 }}>⚠ HAVEN'T SUBMITTED</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {drivers.filter(d => !submitted.has(d.id)).map(d => (
              <span key={d.id} style={{ background: "rgba(255,82,82,0.15)", borderRadius: 4, padding: "3px 10px", fontSize: 12, color: "var(--danger)" }}>{d.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Availability grid */}
      <div className="table-wrap">
        <div className="table-head">
          <div className="table-head-title">Driver Availability</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              {DAY_LABELS.map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {drivers.map(driver => {
              const rec = records.find(r => r.driver_id === driver.id);
              return (
                <tr key={driver.id}>
                  <td style={{ fontWeight: 600 }}>
                    {driver.name}
                    {rec?.updated_after_saturday && (
                      <span title={`Amended — Reason: ${rec.update_reason}`} style={{ marginLeft: 6, color: "var(--accent)", fontSize: 12, cursor: "help" }}>⚠ amended</span>
                    )}
                    {rec?.updated_after_saturday && rec.update_reason && (
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginTop: 2 }}>"{rec.update_reason}"</div>
                    )}
                  </td>
                  {DAYS.map(d => (
                    <td key={d} style={{ textAlign: "center" }}>
                      {!rec ? (
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>
                      ) : rec[d] ? (
                        <div>
                          <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 14 }}>✓</span>
                          {rec[`${d}_done_by`] && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{(() => { const [h, m] = rec[`${d}_done_by`].slice(0,5).split(":"); const hr = parseInt(h); return `${hr % 12 || 12}:${m}${hr >= 12 ? "pm" : "am"}`; })()}</div>}
                        </div>
                      ) : (
                        <span style={{ color: "var(--danger)", fontSize: 14 }}>✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
  const [driverTab, setDriverTab] = useState("overview");

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) setUser({ ...profile, email: session.user.email });
      }
      setAppLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setEntries([]); setAllProfiles([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    async function loadData() {
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (profiles) setAllProfiles(profiles);

      let query = supabase.from("entries").select("*").order("date", { ascending: false });
      if (user.role === "driver") query = query.eq("driver_id", user.id);
      const { data: entryData } = await query;
      if (entryData) setEntries(entryData);
    }
    loadData();
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
    setAllProfiles([]);
    setDriverTab("overview");
  }

  if (appLoading) {
    return (
      <div style={{ background: "#0d0f12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, letterSpacing: 3, color: "#6b7585" }}>
        <style>{css}</style>
        LOADING...
      </div>
    );
  }

  const driverEntries = user?.role === "driver" ? entries : [];

  return (
    <div className="app">
      <style>{css}</style>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <>
          <Topbar user={user} onLogout={handleLogout} />
          {user.role === "driver"
            ? <DriverDashboard driver={user} entries={driverEntries} tab={driverTab} setTab={setDriverTab} />
            : <AdminDashboard allProfiles={allProfiles} entries={entries} setEntries={setEntries} />
          }
        </>
      )}
    </div>
  );
}