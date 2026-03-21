import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getWeekBounds,
  formatDate,
  formatCurrency,
  getMonth,
  getNextWeekStart,
  getNextWeekLabel,
  formatPayPeriod,
  calcReconStreak,
  buildCSVContent,
  validateTripForm,
  buildTripPayload,
  parseCarpageCity,
  buildCarpageNotes,
  parseCarpagePickup,
} from "./utils.js";
import PickupCalculator from "./PickupCalculator";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://yincjogkjvotupzgetqg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
);

function PayPeriodBanner() {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(255,184,0,0.08)",
        border: "1px solid rgba(255,184,0,0.2)",
        borderRadius: 6,
        padding: "6px 14px",
        marginBottom: 20,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: "var(--accent)",
      }}
    >
      <span style={{ fontSize: 14 }}>📅</span> {formatPayPeriod()}
    </div>
  );
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

  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; padding: 0; border: none; }
  .tab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; font-family: var(--font-head); font-size: 12px; font-weight: 700;
    letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer;
    color: var(--muted); background: rgba(255,255,255,0.03);
    border: 1px solid var(--border); border-radius: 6px;
    transition: all 0.15s; white-space: nowrap;
  }
  .tab:hover { color: var(--text); background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
  .tab.active { color: var(--accent); background: rgba(232,180,74,0.08); border-color: rgba(232,180,74,0.3); }
  .tab .tab-icon { font-size: 13px; line-height: 1; }

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
    .driver-detail-grid { grid-template-columns: 1fr; }
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }
  .form-group label {
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .form-group input,
  .form-group select {
    padding: 10px 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
  }
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .driver-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .detail-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
  }
  .detail-section h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent);
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { font-size: 13px; color: var(--muted); font-weight: 600; }
  .detail-value { font-size: 14px; color: var(--text); }

  .error-banner {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgb(239,68,68);
    color: rgb(239,68,68);
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .success-banner {
    background: rgba(34,197,94,0.1);
    border: 1px solid rgb(34,197,94);
    color: rgb(34,197,94);
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .btn-danger {
    background: rgb(239,68,68);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
  }
  .btn-danger:hover { background: rgb(220,38,38); }
  .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
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
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (!profile) {
      setError("No profile found. Contact admin.");
      setLoading(false);
      return;
    }
    onLogin({ ...profile, email: data.user.email });
    setLoading(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          Driver<span>Pay</span>
        </div>
        <div className="login-sub">
          Team earnings portal — sign in to continue
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
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
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
    setTimeout(onClose, 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Change Password</div>
        {success ? (
          <div className="success-toast">✓ Password updated successfully!</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "8px 16px", fontSize: 12 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: 12 }}
                disabled={loading}
              >
                {loading ? "Saving..." : "Update Password →"}
              </button>
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
      {showChangePw && (
        <ChangePasswordModal onClose={() => setShowChangePw(false)} />
      )}
      <div className="topbar">
        <div className="topbar-logo">
          Driver<span>Pay</span>
        </div>
        <div className="topbar-right">
          <div className="topbar-user">
            Signed in as <strong>{user.name}</strong>
            {user.role === "admin" && (
              <span
                style={{
                  color: "var(--accent)",
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                ADMIN
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => setShowChangePw(true)}
          >
            Change Password
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={onLogout}
          >
            Sign Out
          </button>
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
  const emptyAvail = {
    sun: false,
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun_done_by: "",
    mon_done_by: "",
    tue_done_by: "",
    wed_done_by: "",
    thu_done_by: "",
    fri_done_by: "",
    sat_done_by: "",
  };
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
      const { data } = await supabase
        .from("availability")
        .select("*")
        .eq("driver_id", driver.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (data) {
        setExistingRecord(data);
        setAvail({
          sun: data.sun,
          mon: data.mon,
          tue: data.tue,
          wed: data.wed,
          thu: data.thu,
          fri: data.fri,
          sat: data.sat,
          sun_done_by: data.sun_done_by ?? "",
          mon_done_by: data.mon_done_by ?? "",
          tue_done_by: data.tue_done_by ?? "",
          wed_done_by: data.wed_done_by ?? "",
          thu_done_by: data.thu_done_by ?? "",
          fri_done_by: data.fri_done_by ?? "",
          sat_done_by: data.sat_done_by ?? "",
        });
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
      updated_after_saturday: isAfterSat
        ? true
        : (existingRecord?.updated_after_saturday ?? false),
      update_reason: isAfterSat
        ? reason.trim()
        : (existingRecord?.update_reason ?? null),
    };
    DAYS.forEach((d) => {
      if (!avail[d]) payload[`${d}_done_by`] = null;
    });
    await supabase
      .from("availability")
      .upsert(payload, { onConflict: "driver_id,week_start" });
    setSaving(false);
    setSaved(true);
    setReason("");
    setLoadTrigger((t) => t + 1);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading)
    return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div className="form-card fade-in">
      <div className="form-card-title">Availability — {getNextWeekLabel()}</div>

      {existingRecord && (
        <div
          style={{
            background: "rgba(0,200,100,0.08)",
            border: "1px solid rgba(0,200,100,0.2)",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "var(--success)",
          }}
        >
          ✓ You submitted availability for this week on{" "}
          {new Date(existingRecord.submitted_at).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
          .
          {existingRecord.updated_after_saturday && (
            <span style={{ color: "var(--accent)", marginLeft: 6 }}>
              ⚠ Amended after Saturday — Reason: "{existingRecord.update_reason}
              "
            </span>
          )}
        </div>
      )}

      {isAmend && (
        <div
          style={{
            background: "rgba(255,184,0,0.08)",
            border: "1px solid rgba(255,184,0,0.25)",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "var(--accent)",
          }}
        >
          ⚠ You are updating your availability after Saturday. Your manager will
          be notified this was changed and you must provide a reason.
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        {DAYS.map((d, i) => (
          <div
            key={d}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div className="checkbox-row" style={{ margin: 0 }}>
              <input
                type="checkbox"
                id={`avail-${d}`}
                checked={avail[d]}
                onChange={(e) =>
                  setAvail((a) => ({ ...a, [d]: e.target.checked }))
                }
              />
              <label
                htmlFor={`avail-${d}`}
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {DAY_LABELS[i]}
              </label>
            </div>
            {avail[d] && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Done by
                </label>
                <input
                  type="time"
                  value={avail[`${d}_done_by`]}
                  onChange={(e) =>
                    setAvail((a) => ({
                      ...a,
                      [`${d}_done_by`]: e.target.value,
                    }))
                  }
                  style={{ width: 120 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {isAmend && (
        <div className="field" style={{ marginTop: 20 }}>
          <label>
            Reason for change <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Doctor appointment on Monday"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ marginTop: 20 }}
        onClick={handleSave}
        disabled={saving || (isAmend && !reason.trim())}
      >
        {saving
          ? "Saving..."
          : existingRecord
            ? "Update Availability →"
            : "Submit Availability →"}
      </button>
      {saved && (
        <div className="success-toast">
          ✓ Availability {isAmend ? "updated" : "submitted"}!
        </div>
      )}
    </div>
  );
}

// ─── DRIVER DASHBOARD ─────────────────────────────────────────────────────────
function DriverDashboard({ driver, entries, trips, setTrips, tab, setTab }) {
  const now = new Date();
  const { start: wkStart, end: wkEnd } = getWeekBounds(now);
  const thisMonth = now.toISOString().slice(0, 7);

  const weekEntries = entries.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    return d >= wkStart && d <= wkEnd;
  });
  const monthEntries = entries.filter((e) => getMonth(e.date) === thisMonth);
  const weekPay = weekEntries.reduce((s, e) => s + Number(e.pay), 0);
  const weekHours = weekEntries.reduce((s, e) => s + Number(e.hours), 0);
  const monthTrips = monthEntries.length;
  const allTimeTrips = entries.length;
  const reconStreak = calcReconStreak(entries);
  const weekBonus = monthTrips >= 20 ? 50 : 0;
  const reconBonus = reconStreak >= 25 ? 50 : 0;
  const totalWeekPay = weekPay + weekBonus + reconBonus;

  const wkLabel = `${wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${wkEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const sortedWeek = [...weekEntries].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const sortedMonth = [...monthEntries].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  return (
    <div className="page">
      <div className="page-title fade-in">
        {driver.role === "admin"
          ? `Welcome back, ${driver.name.split(" ")[0]}`
          : `Driver Profile — ${driver.name}`}
      </div>
      <div className="page-sub fade-in">
        {driver.role === "admin"
          ? "Your earnings & trip summary"
          : `Viewing ${driver.name}'s earnings & trips`}
      </div>
      <PayPeriodBanner />

      <div className="tabs">
        {[
          { key: "overview", icon: "📊", label: "Overview" },
          { key: "my trips", icon: "🚗", label: "My Trips" },
          { key: "weekly report", icon: "📄", label: "Weekly Report" },
          { key: "monthly report", icon: "📈", label: "Monthly Report" },
          { key: "availability", icon: "📅", label: "Availability" },
          { key: "downloads", icon: "⬇", label: "Downloads" },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="tab-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="stats-grid">
            {[
              {
                label: "This Week's Pay",
                value: formatCurrency(weekPay),
                cls: "accent",
                sub: wkLabel,
              },
              {
                label: "Total w/ Bonuses",
                value: formatCurrency(totalWeekPay),
                cls: "success",
                sub:
                  weekBonus + reconBonus > 0
                    ? `+$${weekBonus + reconBonus} in bonuses!`
                    : "No bonuses yet",
              },
              {
                label: "Hours This Week",
                value: weekHours + "h",
                cls: "",
                sub: `${weekEntries.length} trip${weekEntries.length !== 1 ? "s" : ""}`,
              },
              {
                label: "Trips This Month",
                value: monthTrips,
                cls: "blue",
                sub: `All time: ${allTimeTrips}`,
              },
              {
                label: "Miles This Week",
                value:
                  weekEntries.reduce((s, e) => s + Number(e.miles ?? 0), 0) +
                  " mi",
                cls: "",
                sub: `All time: ${entries.reduce((s, e) => s + Number(e.miles ?? 0), 0)} mi`,
              },
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
                {monthTrips >= 20 && (
                  <div className="bonus-earned">+$50 EARNED</div>
                )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill trips"
                  style={{
                    width: Math.min(100, (monthTrips / 20) * 100) + "%",
                  }}
                />
              </div>
              <div className="bonus-count" style={{ color: "var(--accent2)" }}>
                {monthTrips}
                <span
                  style={{
                    fontSize: 16,
                    color: "var(--muted)",
                    fontWeight: 400,
                  }}
                >
                  /20
                </span>
              </div>
              <div className="bonus-desc">
                Reach 20 trips this month for a $50 bonus
              </div>
            </div>
            <div className="bonus-card fade-in fade-in-4">
              <div className="bonus-header">
                <div className="bonus-title">Clean Recon Streak</div>
                {reconStreak >= 25 && (
                  <div className="bonus-earned">+$50 EARNED</div>
                )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill recon"
                  style={{
                    width: Math.min(100, (reconStreak / 25) * 100) + "%",
                  }}
                />
              </div>
              <div className="bonus-count" style={{ color: "var(--success)" }}>
                {reconStreak}
                <span
                  style={{
                    fontSize: 16,
                    color: "var(--muted)",
                    fontWeight: 400,
                  }}
                >
                  /25
                </span>
              </div>
              <div className="bonus-desc">
                25 consecutive trips with no missed recon for a $50 bonus
              </div>
            </div>
          </div>

          <div className="table-wrap fade-in fade-in-4">
            <div className="table-head">
              <div className="table-head-title">Recent Trips</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>City</th>
                  <th>Carpage ID</th>
                  <th>Pay</th>
                  <th>Hours</th>
                  <th>Recon</th>
                </tr>
              </thead>
              <tbody>
                {[...entries]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map((e) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td>{e.city}</td>
                      <td
                        style={{
                          color: "var(--muted)",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        {e.crm_id}
                      </td>
                      <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                        {formatCurrency(e.pay)}
                      </td>
                      <td>{e.hours}h</td>
                      <td>
                        <span
                          className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`}
                        >
                          {e.recon_missed ? "MISSED" : "OK"}
                        </span>
                      </td>
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
              <span
                style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}
              >
                {wkLabel}
              </span>
            </div>
            {sortedWeek.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                No trips logged this week yet.
              </div>
            )}
            {sortedWeek.map((e) => (
              <div key={e.id} className="report-row">
                <span>
                  {formatDate(e.date)} — {e.city}
                </span>
                <span
                  style={{ display: "flex", gap: 16, alignItems: "center" }}
                >
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {e.crm_id}
                  </span>
                  <span>{e.hours}h</span>
                  <span
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      minWidth: 70,
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(e.pay)}
                  </span>
                </span>
              </div>
            ))}
            {weekBonus > 0 && (
              <div className="report-row">
                <span style={{ color: "var(--success)" }}>
                  Monthly Trip Bonus (20+ trips)
                </span>
                <span style={{ color: "var(--success)" }}>+$50.00</span>
              </div>
            )}
            {reconBonus > 0 && (
              <div className="report-row">
                <span style={{ color: "var(--success)" }}>
                  Clean Recon Bonus (25 streak)
                </span>
                <span style={{ color: "var(--success)" }}>+$50.00</span>
              </div>
            )}
            <div className="report-total">
              <span>TOTAL</span>
              <span>{formatCurrency(totalWeekPay)}</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => window.print()}>
            ⬇ Download PDF
          </button>
        </div>
      )}

      {tab === "monthly report" && (
        <div className="fade-in">
          <div className="report-section">
            <div className="report-title">
              <span>Monthly Report</span>
              <span
                style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}
              >
                {new Date(thisMonth + "-01").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {sortedMonth.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                No trips logged this month yet.
              </div>
            )}
            {sortedMonth.map((e) => (
              <div key={e.id} className="report-row">
                <span>
                  {formatDate(e.date)} — {e.city}
                </span>
                <span
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {e.crm_id}
                  </span>
                  <span>{e.hours}h</span>
                  <span
                    className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`}
                    style={{ fontSize: 9 }}
                  >
                    {e.recon_missed ? "RECON MISSED" : "RECON OK"}
                  </span>
                  <span
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      minWidth: 70,
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(e.pay)}
                  </span>
                </span>
              </div>
            ))}
            {weekBonus > 0 && (
              <div className="report-row">
                <span style={{ color: "var(--success)" }}>
                  Monthly Trip Bonus
                </span>
                <span style={{ color: "var(--success)" }}>+$50.00</span>
              </div>
            )}
            <div className="report-total">
              <span>TOTAL — {monthTrips} TRIPS</span>
              <span>
                {formatCurrency(
                  monthEntries.reduce((s, e) => s + Number(e.pay), 0) +
                    weekBonus,
                )}
              </span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => window.print()}>
            ⬇ Download PDF
          </button>
        </div>
      )}

      {tab === "my trips" && (
        <DriverTrips driver={driver} trips={trips} setTrips={setTrips} />
      )}

      {tab === "availability" && <DriverAvailability driver={driver} />}

      {tab === "downloads" && (
        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 24,
            }}
          >
            App Downloads
          </div>
          <a
            href="https://testflight.apple.com/join/YOURCODE"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid #3b8cf7",
              padding: "20px 24px",
              marginBottom: 12,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>🍎</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                iOS App
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Install via TestFlight
              </div>
            </div>
          </a>
          <a
            href="/driverportal.apk"
            download
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid #4ae885",
              padding: "20px 24px",
              marginBottom: 12,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>🤖</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                Android App
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Download & install APK
              </div>
            </div>
          </a>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            Android: after downloading, open the file and allow installation
            from unknown sources when prompted.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditEntryModal({ entry, drivers, onSave, onClose }) {
  const [form, setForm] = useState({
    ...entry,
    pay: String(entry.pay),
    hours: String(entry.hours),
    miles: String(entry.miles ?? 0),
    actual_cost: String(entry.actual_cost ?? 0),
    estimated_cost: String(entry.estimated_cost ?? 0),
    carpage_link: entry.carpage_link ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("entries")
      .update({
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
      })
      .eq("id", form.id);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    onSave({
      ...form,
      pay: Number(form.pay),
      hours: Number(form.hours),
      miles: Number(form.miles),
      actual_cost: Number(form.actual_cost),
      estimated_cost: Number(form.estimated_cost),
      carpage_link: form.carpage_link || null,
    });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Entry</div>
        <div className="form-grid">
          <div className="field">
            <label>Driver</label>
            <select
              value={form.driver_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, driver_id: e.target.value }))
              }
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.willing_to_fly ? ' (F)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Pay Amount ($)</label>
            <input
              type="number"
              value={form.pay}
              onChange={(e) => setForm((f) => ({ ...f, pay: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Hours Worked</label>
            <input
              type="number"
              value={form.hours}
              onChange={(e) =>
                setForm((f) => ({ ...f, hours: e.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>Miles Driven</label>
            <input
              type="number"
              value={form.miles}
              onChange={(e) =>
                setForm((f) => ({ ...f, miles: e.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>Actual Cost ($)</label>
            <input
              type="number"
              value={form.actual_cost}
              onChange={(e) =>
                setForm((f) => ({ ...f, actual_cost: e.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>Estimated Cost ($)</label>
            <input
              type="number"
              value={form.estimated_cost}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimated_cost: e.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Carpage ID</label>
            <input
              type="text"
              value={form.crm_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, crm_id: e.target.value }))
              }
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Carpage Link</label>
            <input
              type="url"
              placeholder="https://..."
              value={form.carpage_link}
              onChange={(e) =>
                setForm((f) => ({ ...f, carpage_link: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="checkbox-row" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            id="edit-recon"
            checked={form.recon_missed}
            onChange={(e) =>
              setForm((f) => ({ ...f, recon_missed: e.target.checked }))
            }
          />
          <label
            htmlFor="edit-recon"
            style={{
              color: form.recon_missed ? "var(--danger)" : "var(--text)",
            }}
          >
            Recon was missed on this vehicle
          </label>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className="modal-actions">
          <button
            className="btn btn-ghost"
            style={{ padding: "8px 16px", fontSize: 12 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: 12 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV EXPORT HELPER ────────────────────────────────────────────────────────
function exportCSV(entries, profiles) {
  const csv = buildCSVContent(entries, profiles);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `driverpay-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── MILEAGE COST REPORT ──────────────────────────────────────────────────────
function MileageCostReport({
  entries,
  drivers,
  allProfiles,
  thisMonth,
  wkStart,
  wkEnd,
}) {
  const [reportType, setReportType] = useState("weekly");
  const [selectedDriver, setSelectedDriver] = useState("all");

  const filtered = entries.filter((e) => {
    const inPeriod =
      reportType === "weekly"
        ? (() => {
            const d = new Date(e.date + "T12:00:00");
            return d >= wkStart && d <= wkEnd;
          })()
        : getMonth(e.date) === thisMonth;
    const inDriver = selectedDriver === "all" || e.driver_id === selectedDriver;
    return inPeriod && inDriver;
  });

  const totalActual = filtered.reduce(
    (s, e) => s + Number(e.actual_cost ?? 0),
    0,
  );
  const totalEstimated = filtered.reduce(
    (s, e) => s + Number(e.estimated_cost ?? 0),
    0,
  );
  const totalMiles = filtered.reduce((s, e) => s + Number(e.miles ?? 0), 0);
  const variance = totalActual - totalEstimated;

  const periodLabel =
    reportType === "weekly"
      ? `${wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${wkEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : new Date(thisMonth + "-01").toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

  return (
    <div className="fade-in">
      {/* Controls */}
      <div className="form-card" style={{ marginBottom: 16, padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Period</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Driver</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              <option value="all">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.willing_to_fly ? ' (F)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "10px 16px", fontSize: 12 }}
            onClick={() => exportCSV(filtered, allProfiles)}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          {
            label: "Total Miles",
            value: totalMiles + " mi",
            cls: "",
            sub: periodLabel,
          },
          {
            label: "Total Actual Cost",
            value: formatCurrency(totalActual),
            cls: "danger",
            sub: `${filtered.length} trips`,
          },
          {
            label: "Total Estimated Cost",
            value: formatCurrency(totalEstimated),
            cls: "blue",
            sub: `${filtered.length} trips`,
          },
          {
            label: "Variance",
            value: (variance >= 0 ? "+" : "") + formatCurrency(variance),
            cls: variance > 0 ? "danger" : "success",
            sub:
              variance > 0
                ? "Over estimate"
                : variance < 0
                  ? "Under estimate"
                  : "On target",
          },
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
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {filtered.length} trips
          </span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>
            No entries with cost data for this period.
          </div>
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
              {[...filtered]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((e) => {
                  const driver = allProfiles.find((u) => u.id === e.driver_id);
                  const v =
                    Number(e.actual_cost ?? 0) - Number(e.estimated_cost ?? 0);
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>
                        {driver?.name ?? "—"}
                        {driver?.willing_to_fly && <span style={{ color: "var(--accent)", marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(F)</span>}
                      </td>
                      <td>{formatDate(e.date)}</td>
                      <td>{e.city}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {e.miles ?? 0} mi
                      </td>
                      <td style={{ color: "var(--danger)", fontWeight: 600 }}>
                        {formatCurrency(e.actual_cost ?? 0)}
                      </td>
                      <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                        {formatCurrency(e.estimated_cost ?? 0)}
                      </td>
                      <td
                        style={{
                          color:
                            v > 0
                              ? "var(--danger)"
                              : v < 0
                                ? "var(--success)"
                                : "var(--muted)",
                          fontWeight: 600,
                        }}
                      >
                        {v >= 0 ? "+" : ""}
                        {formatCurrency(v)}
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
    const map = window.L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([36.0, -80.0], 6);
    window.L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
      },
    ).addTo(map);
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
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (locs.length === 0) return;

    const bounds = [];
    locs.forEach((loc) => {
      const driver = drivers.find((d) => d.id === loc.driver_id);
      const name = driver?.name ?? "Unknown Driver";
      const age = Math.floor((new Date() - new Date(loc.updated_at)) / 1000);
      const ageLabel =
        age < 60
          ? `${age}s ago`
          : age < 3600
            ? `${Math.floor(age / 60)}m ago`
            : `${Math.floor(age / 3600)}h ago`;
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
        .bindPopup(
          `
          <div style="font-family: 'Barlow Condensed', sans-serif; min-width: 140px; background: #161a20; color: #e8ecf0; border: none;">
            <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 11px; color: #6b7585; letter-spacing: 1px;">LAST UPDATE</div>
            <div style="font-size: 13px; font-weight: 600; color: ${isRecent ? "#4ae885" : "#f5a623"};">${ageLabel}</div>
            <div style="font-size: 10px; color: #444; margin-top: 6px;">${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</div>
          </div>
        `,
          {
            className: "dark-popup",
          },
        )
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

  const activeLocs = locations.filter((l) => {
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#4ae885",
                boxShadow: "0 0 6px #4ae885",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "#4ae885",
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {activeLocs.length} ACTIVE
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {locations.length === 0
              ? "No drivers currently driving"
              : `${locations.length} driver${locations.length !== 1 ? "s" : ""} tracked`}
          </div>
          <div style={{ fontSize: 11, color: "#444" }}>
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ padding: "6px 14px", fontSize: 12 }}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Driver status pills */}
      {locations.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {locations.map((loc) => {
            const driver = drivers.find((d) => d.id === loc.driver_id);
            const age = Math.floor(
              (new Date() - new Date(loc.updated_at)) / 1000,
            );
            const isRecent = age < 120;
            const ageLabel =
              age < 60
                ? `${age}s ago`
                : age < 3600
                  ? `${Math.floor(age / 60)}m ago`
                  : `${Math.floor(age / 3600)}h ago`;
            return (
              <div
                key={loc.driver_id}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isRecent ? "rgba(74,232,133,0.3)" : "var(--border)"}`,
                  borderRadius: 4,
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isRecent ? "#4ae885" : "#f5a623",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {driver?.name ?? "Unknown"}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {ageLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Map */}
      <div
        style={{
          position: "relative",
          borderRadius: 0,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div
          ref={mapRef}
          style={{ height: 500, width: "100%", background: "#0d0f12" }}
        />
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,15,18,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              letterSpacing: 2,
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            LOADING MAP...
          </div>
        )}
        {!loading && locations.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 32, opacity: 0.2 }}>🚗</div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 2,
                color: "var(--muted)",
                fontWeight: 700,
              }}
            >
              NO ACTIVE DRIVERS
            </div>
            <div style={{ fontSize: 12, color: "#333" }}>
              Drivers appear here when a trip is in progress
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 10,
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#4ae885",
              boxShadow: "0 0 5px #4ae885",
            }}
          />
          <span>Updated &lt; 2 min ago</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f5a623",
              boxShadow: "0 0 5px #f5a623",
            }}
          />
          <span>Updated &gt; 2 min ago</span>
        </div>
      </div>
    </div>
  );
}

function ManageUsers({ allProfiles, setAllProfiles }) {
  const [view, setView] = useState("list"); // list | add | view
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "driver",
    phone_number: "",
    date_of_birth: "",
    can_drive_manual: false,
    drivers_license_number: "",
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required");
      return;
    }
    setSaving(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Session expired. Please log in again.");
      setSaving(false);
      return;
    }

    // Step 1: Create the user account
    const response = await fetch(
      `https://yincjogkjvotupzgetqg.supabase.co/functions/v1/manage-users`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Failed to create user");
      setSaving(false);
      return;
    }

    const newUserId = result.userId;

    // Step 2: Upload license photo if provided
    let licensePhotoUrl = null;
    if (licenseFile && newUserId) {
      setUploading(true);
      const fileExt = licenseFile.name.split('.').pop();
      const fileName = `${newUserId}/license.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-licenses')
        .upload(fileName, licenseFile, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        console.error("License upload error:", uploadError);
        setError(`User created but license upload failed: ${uploadError.message}`);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('driver-licenses')
          .getPublicUrl(fileName);
        licensePhotoUrl = publicUrl;
      }
      setUploading(false);
    }

    // Step 3: Update profile with additional fields
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone_number: form.phone_number || null,
        date_of_birth: form.date_of_birth || null,
        can_drive_manual: form.can_drive_manual,
        drivers_license_number: form.drivers_license_number || null,
        drivers_license_photo_url: licensePhotoUrl,
      })
      .eq("id", newUserId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      setError(`User created but profile update failed: ${updateError.message}`);
      setSaving(false);
      return;
    }

    const { data: profiles } = await supabase.from("profiles").select("*");
    if (profiles) setAllProfiles(profiles);

    setSaving(false);
    setSuccess(`✓ Created ${form.name}`);
    setForm({
      name: "", email: "", password: "", role: "driver",
      phone_number: "", date_of_birth: "",
      can_drive_manual: false, drivers_license_number: "",
    });
    setLicenseFile(null);
    setTimeout(() => {
      setSuccess("");
      setView("list");
    }, 2000);
  }

  async function handleDelete(user) {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;

    setDeleting(user.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(null);
      setError("Session expired. Please log in again.");
      return;
    }

    // Delete license photo if exists
    if (user.drivers_license_photo_url) {
      await supabase.storage
        .from('driver-licenses')
        .remove([`${user.id}/license.${user.drivers_license_photo_url.split('.').pop()}`]);
    }

    const response = await fetch(
      `https://yincjogkjvotupzgetqg.supabase.co/functions/v1/manage-users`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete", userId: user.id }),
      }
    );

    if (!response.ok) {
      const result = await response.json();
      setDeleting(null);
      setError(result.error || "Failed to delete user");
      return;
    }

    const { data: profiles } = await supabase.from("profiles").select("*");
    if (profiles) setAllProfiles(profiles);
    setDeleting(null);
  }

  function viewDriver(driver) {
    setSelectedDriver(driver);
    setView("view");
  }

  if (view === "add") {
    return (
      <div>
        <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setView("list")} className="btn-secondary">
            ← Back
          </button>
          <h2 style={{ margin: 0 }}>Create New User</h2>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <div className="form-grid">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full Name"
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
            />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Driver's License Number</label>
            <input
              type="text"
              value={form.drivers_license_number}
              onChange={(e) => setForm({ ...form, drivers_license_number: e.target.value })}
              placeholder="DL123456"
            />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>
              <input
                type="checkbox"
                checked={form.can_drive_manual}
                onChange={(e) => setForm({ ...form, can_drive_manual: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Can drive manual transmission (stick shift)
            </label>
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Driver's License Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLicenseFile(e.target.files[0])}
            />
            {licenseFile && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                Selected: {licenseFile.name}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving || uploading}
          className="btn btn-primary"
          style={{ marginTop: 24 }}
        >
          {saving ? "Creating..." : uploading ? "Uploading License..." : "Create User"}
        </button>
      </div>
    );
  }

  if (view === "view" && selectedDriver) {
    return (
      <div>
        <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => { setView("list"); setSelectedDriver(null); }} className="btn-secondary">
            ← Back
          </button>
          <h2 style={{ margin: 0 }}>{selectedDriver.name}</h2>
        </div>

        <div className="driver-detail-grid">
          <div className="detail-section">
            <h3>Basic Information</h3>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{selectedDriver.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Role:</span>
              <span className="detail-value" style={{
                textTransform: "capitalize",
                color: selectedDriver.role === "admin" ? "var(--accent)" : "inherit",
              }}>
                {selectedDriver.role}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">{selectedDriver.phone_number || "—"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date of Birth:</span>
              <span className="detail-value">
                {selectedDriver.date_of_birth
                  ? new Date(selectedDriver.date_of_birth).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Willing to Fly:</span>
              <span className="detail-value">
                {selectedDriver.willing_to_fly ? "✓ Yes" : "✗ No"}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>License &amp; Driving</h3>
            <div className="detail-row">
              <span className="detail-label">Can Drive Manual:</span>
              <span className="detail-value" style={{
                color: selectedDriver.can_drive_manual ? "var(--success)" : "var(--muted)",
              }}>
                {selectedDriver.can_drive_manual ? "✓ Yes (Stick Shift)" : "✗ Automatic Only"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">License Number:</span>
              <span className="detail-value">{selectedDriver.drivers_license_number || "—"}</span>
            </div>
            {selectedDriver.drivers_license_photo_url && (
              <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <span className="detail-label">License Photo:</span>
                <img
                  src={selectedDriver.drivers_license_photo_url}
                  alt="Driver's License"
                  style={{
                    maxWidth: "100%", maxHeight: 300,
                    marginTop: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => handleDelete(selectedDriver)}
          disabled={deleting === selectedDriver.id}
          className="btn-danger"
          style={{ marginTop: 24 }}
        >
          {deleting === selectedDriver.id ? "Deleting..." : "Delete User"}
        </button>
      </div>
    );
  }

  // Default list view
  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Manage Users</h2>
        <button onClick={() => setView("add")} className="btn btn-primary">
          + Create User
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Manual Trans</th>
              <th>Willing to Fly</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allProfiles.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 600 }}>{user.name}</td>
                <td style={{ textTransform: "capitalize" }}>
                  {user.role === "admin" && <span style={{ color: "var(--accent)" }}>★ </span>}
                  {user.role}
                </td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>
                  {user.phone_number || "—"}
                </td>
                <td style={{ textAlign: "center" }}>
                  {user.can_drive_manual
                    ? <span style={{ color: "var(--success)" }}>✓</span>
                    : <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
                <td style={{ textAlign: "center" }}>
                  {user.willing_to_fly
                    ? <span style={{ color: "var(--accent)" }}>✈</span>
                    : <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
                <td>
                  <button
                    onClick={() => viewDriver(user)}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "4px 12px" }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({
  allProfiles,
  setAllProfiles,
  entries,
  setEntries,
  trips,
  setTrips,
  prefillData,
  onPrefillConsumed,
}) {
  const drivers = allProfiles.filter((u) => u.role === "driver");
  const [tab, setTab] = useState(prefillData ? "trips" : "overview");
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
    pay: "",
    hours: "",
    miles: "",
    actual_cost: "",
    estimated_cost: "",
    city: "",
    crm_id: "",
    carpage_link: "",
    recon_missed: false,
  });

  useEffect(() => {
    if (drivers.length > 0 && !form.driver_id) {
      setForm((f) => ({ ...f, driver_id: drivers[0].id }));
    }
  }, [drivers.length]);

  async function handleSubmit() {
    if (!form.driver_id || !form.date || !form.pay) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("entries")
      .insert({
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
      })
      .select()
      .single();
    if (!error && data) {
      setEntries((prev) => [...prev, data]);
      setForm((f) => ({
        ...f,
        pay: "",
        hours: "",
        miles: "",
        actual_cost: "",
        estimated_cost: "",
        city: "",
        crm_id: "",
        carpage_link: "",
        recon_missed: false,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSubmitting(false);
  }

  function handleSaveEdit(updated) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingEntry(null);
  }

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    if (filterDriver !== "all" && e.driver_id !== filterDriver) return false;
    if (filterCity && !e.city.toLowerCase().includes(filterCity.toLowerCase()))
      return false;
    if (filterFrom && e.date < filterFrom) return false;
    if (filterTo && e.date > filterTo) return false;
    return true;
  });

  const uniqueCities = [...new Set(entries.map((e) => e.city))].sort();

  if (selectedDriver) {
    const driverEntries = entries.filter(
      (e) => e.driver_id === selectedDriver.id,
    );
    return (
      <div className="page">
        <button
          className="btn btn-ghost"
          style={{ marginBottom: 20, padding: "6px 14px", fontSize: 12 }}
          onClick={() => setSelectedDriver(null)}
        >
          ← All Drivers
        </button>
        <DriverDashboard
          driver={selectedDriver}
          entries={driverEntries}
          trips={trips.filter(
            (t) =>
              t.driver_id === selectedDriver.id ||
              t.second_driver_id === selectedDriver.id,
          )}
          setTrips={setTrips}
          tab={driverTab}
          setTab={setDriverTab}
        />
      </div>
    );
  }

  return (
    <div className="page">
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          drivers={allProfiles}
          onSave={handleSaveEdit}
          onClose={() => setEditingEntry(null)}
        />
      )}

      <div className="page-title fade-in">Admin Dashboard</div>
      <div className="page-sub fade-in">
        Manage driver entries and view all accounts
      </div>
      <PayPeriodBanner />

      <div className="tabs">
        {[
          { key: "overview", icon: "📊", label: "Overview" },
          { key: "trips", icon: "🚗", label: "Trips" },
          { key: "log entry", icon: "📝", label: "Log Entry" },
          { key: "all entries", icon: "📋", label: "All Entries" },
          { key: "mileage costs", icon: "⛽", label: "Mileage Costs" },
          { key: "availability", icon: "📅", label: "Availability" },
          { key: "live drivers", icon: "📍", label: "Live Drivers" },
          { key: "manage users", icon: "👥", label: "Manage Users" },
          { key: "pickup calculator", icon: "🧮", label: "Pickup Calc" },
          { key: "downloads", icon: "⬇", label: "Downloads" },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="tab-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 16,
            }}
          >
            This Week's Earnings — Click any driver to view full dashboard
          </div>
          {drivers.length === 0 && (
            <div
              style={{ color: "var(--muted)", fontSize: 14, padding: "24px 0" }}
            >
              No drivers added yet. Add driver accounts in Supabase Auth, then
              insert them into the profiles table with{" "}
              <code style={{ background: "var(--bg)", padding: "1px 6px" }}>
                role = 'driver'
              </code>
              .
            </div>
          )}
          <div className="driver-grid">
            {drivers.map((d, i) => {
              const driverEntries = entries.filter((e) => e.driver_id === d.id);
              const weekEntries = driverEntries.filter((e) => {
                const dt = new Date(e.date + "T12:00:00");
                return dt >= wkStart && dt <= wkEnd;
              });
              const weekPay = weekEntries.reduce(
                (s, e) => s + Number(e.pay),
                0,
              );
              const monthTrips = driverEntries.filter(
                (e) => getMonth(e.date) === thisMonth,
              ).length;
              return (
                <div
                  key={d.id}
                  className={`driver-card fade-in fade-in-${Math.min(i + 1, 5)}`}
                  onClick={() => {
                    setSelectedDriver(d);
                    setDriverTab("overview");
                  }}
                >
                  <div className="driver-name">
                    {d.name}
                    {d.willing_to_fly && <span style={{ color: "var(--accent)", marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(F)</span>}
                  </div>
                  <div className="driver-meta">
                    {weekEntries.length} trips this week · {monthTrips} this
                    month
                  </div>
                  <div className="driver-pay">{formatCurrency(weekPay)}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    this week
                  </div>
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
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              No drivers in the system yet. Add driver profiles first.
            </div>
          ) : (
            <>
              <div className="form-grid">
                <div className="field">
                  <label>Driver</label>
                  <select
                    value={form.driver_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, driver_id: e.target.value }))
                    }
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.willing_to_fly ? ' (F)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Pay Amount ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.pay}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pay: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Hours Worked</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.hours}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hours: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Miles Driven</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.miles}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, miles: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Actual Cost ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.actual_cost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, actual_cost: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Estimated Cost ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.estimated_cost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estimated_cost: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>City</label>
                  <input
                    type="text"
                    placeholder="Charlotte"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Carpage ID</label>
                  <input
                    type="text"
                    placeholder="CP-XXXX"
                    value={form.crm_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, crm_id: e.target.value }))
                    }
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Carpage Link</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.carpage_link}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, carpage_link: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="recon"
                  checked={form.recon_missed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, recon_missed: e.target.checked }))
                  }
                />
                <label
                  htmlFor="recon"
                  style={{
                    color: form.recon_missed ? "var(--danger)" : "var(--text)",
                  }}
                >
                  Recon was missed on this vehicle
                </label>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Entry →"}
              </button>
              {saved && (
                <div className="success-toast">✓ Entry saved to database</div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "all entries" && (
        <>
          {/* Filters */}
          <div
            className="form-card fade-in"
            style={{ marginBottom: 16, padding: 20 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                alignItems: "end",
              }}
            >
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Driver</label>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                >
                  <option value="all">All Drivers</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.willing_to_fly ? ' (F)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>City</label>
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>From</label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>To</label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                />
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: "10px 16px", fontSize: 12 }}
                onClick={() => {
                  setFilterDriver("all");
                  setFilterCity("");
                  setFilterFrom("");
                  setFilterTo("");
                }}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "10px 16px", fontSize: 12 }}
                onClick={() => exportCSV(filteredEntries, allProfiles)}
              >
                ⬇ Export CSV
              </button>
            </div>
          </div>

          <div className="table-wrap fade-in">
            <div className="table-head">
              <div className="table-head-title">All Trip Entries</div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {filteredEntries.length} of {entries.length} entries
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>City</th>
                  <th>Carpage ID</th>
                  <th>Pay</th>
                  <th>Hours</th>
                  <th>Miles</th>
                  <th>Recon</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredEntries]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((e) => {
                    const driver = allProfiles.find(
                      (u) => u.id === e.driver_id,
                    );
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600 }}>
                          {driver?.name ?? "—"}
                          {driver?.willing_to_fly && <span style={{ color: "var(--accent)", marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(F)</span>}
                        </td>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.city}</td>
                        <td
                          style={{
                            color: "var(--muted)",
                            fontFamily: "monospace",
                            fontSize: 12,
                          }}
                        >
                          {e.carpage_link ? (
                            <a
                              href={e.carpage_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "var(--accent)",
                                textDecoration: "none",
                              }}
                            >
                              {e.crm_id} ↗
                            </a>
                          ) : (
                            e.crm_id
                          )}
                        </td>
                        <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {formatCurrency(e.pay)}
                        </td>
                        <td>{e.hours}h</td>
                        <td style={{ color: "var(--muted)" }}>
                          {e.miles ?? 0} mi
                        </td>
                        <td>
                          <span
                            className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`}
                          >
                            {e.recon_missed ? "MISSED" : "OK"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => setEditingEntry(e)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "trips" && (
        <AdminTrips
          drivers={drivers}
          allProfiles={allProfiles}
          trips={trips}
          setTrips={setTrips}
          setEntries={setEntries}
          prefillData={prefillData}
          onPrefillConsumed={onPrefillConsumed}
        />
      )}

      {tab === "mileage costs" && (
        <MileageCostReport
          entries={entries}
          drivers={drivers}
          allProfiles={allProfiles}
          thisMonth={thisMonth}
          wkStart={wkStart}
          wkEnd={wkEnd}
        />
      )}

      {tab === "availability" && <AdminAvailability drivers={drivers} />}
      {tab === "live drivers" && <LiveDriversMap drivers={drivers} />}
      {tab === "pickup calculator" && <PickupCalculator />}
      {tab === "downloads" && (
        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 24,
            }}
          >
            App Downloads
          </div>
          <a
            href="https://testflight.apple.com/join/YOURCODE"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid #3b8cf7",
              padding: "20px 24px",
              marginBottom: 12,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>🍎</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                iOS App
              </div>
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}
              >
                Install via TestFlight
              </div>
            </div>
          </a>
          <a
            href="/driverportal.apk"
            download
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid #4ae885",
              padding: "20px 24px",
              marginBottom: 12,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 28 }}>🤖</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                Android App
              </div>
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}
              >
                Download & install APK
              </div>
            </div>
          </a>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            Android: after downloading, open the file and allow installation
            from unknown sources when prompted.
          </div>
        </div>
      )}
      {tab === "manage users" && (
        <ManageUsers
          allProfiles={allProfiles}
          setAllProfiles={setAllProfiles}
        />
      )}
    </div>
  );
}

// ─── TRIP STATUS BADGE ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: "#3b8cf7",
  in_progress: "#e8b44a",
  completed: "#4ae885",
  finalized: "#6b7585",
};
function TripStatusBadge({ status }) {
  return (
    <span
      style={{
        background: `${STATUS_COLORS[status]}22`,
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}44`,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// ─── CREATE TRIP ──────────────────────────────────────────────────────────────
function CreateTrip({ drivers, onCreated, prefillData, onPrefillConsumed }) {
  const now = new Date();
  const [form, setForm] = useState({
    driver_id: drivers[0]?.id || "",
    second_driver_id: "",
    designated_driver_id: "",
    trip_type: "fly",
    city: "",
    crm_id: "",
    carpage_link: "",
    scheduled_pickup: now.toISOString().slice(0, 16),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);

  // Add this useEffect after your useState declarations:
  useEffect(() => {
    if (!prefillData) return;
    if (prefillData.crm_id) set("crm_id", prefillData.crm_id);
    if (prefillData.city) set("city", prefillData.city);
    if (prefillData.notes) set("notes", prefillData.notes);
    if (prefillData.scheduled_pickup)
      set("scheduled_pickup", prefillData.scheduled_pickup);
    if (prefillData.carpage_link) set("carpage_link", prefillData.carpage_link);
    if (onPrefillConsumed) onPrefillConsumed();
  }, [prefillData]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCarpageLink(url) {
    set("carpage_link", url);
    if (!url.includes("carpage.io")) return;

    setFetching(true);
    try {
      const response = await fetch(url, { credentials: "include" });
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const getInput = (name) =>
        doc.querySelector(`input[name="${name}"]`)?.value ?? "";

      const crmId = new URL(url).searchParams.get("cid") ?? "";
      const address = getInput("address");
      const city = parseCarpageCity(address);
      const scheduledPickup = parseCarpagePickup(getInput("pickup_time_text"));

      const sellerPhone = getInput("contact_phone");
      const place = getInput("place");
      const vin = getInput("car_vin");
      const boughtPrice = getInput("bought_price");
      const note =
        doc.querySelector("div[data-name='note']")?.textContent?.trim() ?? "";

      // Seller name
      let sellerName = "";
      for (const row of doc.querySelectorAll(".car-pickup__row")) {
        if (
          row.querySelector(".car-pickup__label")?.textContent?.trim() ===
          "Name:"
        ) {
          sellerName =
            row.querySelector(".car-pickup__value")?.textContent?.trim() ?? "";
          break;
        }
      }

      const notes = buildCarpageNotes({
        sellerName,
        sellerPhone,
        place,
        address,
        note,
        vin,
        boughtPrice,
      });

      if (crmId) set("crm_id", crmId);
      if (city) set("city", city);
      if (notes) set("notes", notes);
      if (scheduledPickup) set("scheduled_pickup", scheduledPickup);
    } catch (e) {
      console.error("CarPage fetch error:", e);
    } finally {
      setFetching(false);
    }
  }

  async function handleCreate() {
    const validationError = validateTripForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    const payload = buildTripPayload(form);
    const { data, error: err } = await supabase
      .from("trips")
      .insert(payload)
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCreated(data);
    setSaved(true);
    setForm((f) => ({
      ...f,
      city: "",
      crm_id: "",
      carpage_link: "",
      notes: "",
      second_driver_id: "",
      designated_driver_id: "",
    }));
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="form-card fade-in">
      <div className="form-card-title">Create Trip</div>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>
            Carpage Link{" "}
            {fetching && (
              <span
                style={{
                  color: "var(--accent)",
                  fontSize: 11,
                  marginLeft: 8,
                  letterSpacing: 1,
                }}
              >
                LOADING...
              </span>
            )}
          </label>
          <input
            type="url"
            placeholder="Paste CarPage pickup link to auto-fill..."
            value={form.carpage_link}
            onChange={(e) => handleCarpageLink(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Trip Type</label>
          <select
            value={form.trip_type}
            onChange={(e) => set("trip_type", e.target.value)}
          >
            <option value="fly">✈ Fly</option>
            <option value="drive">🚗 Drive</option>
          </select>
        </div>
        <div className="field">
          <label>Scheduled Pickup</label>
          <input
            type="datetime-local"
            value={form.scheduled_pickup}
            onChange={(e) => set("scheduled_pickup", e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            {form.trip_type === "drive"
              ? "Driver 1 (Chase Car)"
              : "Assigned Driver"}
          </label>
          <select
            value={form.driver_id}
            onChange={(e) => set("driver_id", e.target.value)}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.willing_to_fly ? ' (F)' : ''}
              </option>
            ))}
          </select>
        </div>
        {form.trip_type === "drive" && (
          <div className="field">
            <label>Driver 2 (Drives Vehicle Back)</label>
            <select
              value={form.second_driver_id}
              onChange={(e) => set("second_driver_id", e.target.value)}
            >
              <option value="">— Select —</option>
              {drivers
                .filter((d) => d.id !== form.driver_id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.willing_to_fly ? ' (F)' : ''}
                  </option>
                ))}
            </select>
          </div>
        )}
        {form.trip_type === "drive" && form.second_driver_id && (
          <div className="field">
            <label>Designated Driver (controls Start/End)</label>
            <select
              value={form.designated_driver_id || form.driver_id}
              onChange={(e) => set("designated_driver_id", e.target.value)}
            >
              <option value={form.driver_id}>
                {(() => { const d = drivers.find((d) => d.id === form.driver_id); return d ? `${d.name}${d.willing_to_fly ? ' (F)' : ''}` : ''; })()}
              </option>
              <option value={form.second_driver_id}>
                {(() => { const d = drivers.find((d) => d.id === form.second_driver_id); return d ? `${d.name}${d.willing_to_fly ? ' (F)' : ''}` : ''; })()}
              </option>
            </select>
          </div>
        )}
        <div className="field">
          <label>City / Pickup Location</label>
          <input
            type="text"
            placeholder="Columbus, OH"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>
        <div className="field">
          <label>CRM ID</label>
          <input
            type="text"
            placeholder="AB123"
            value={form.crm_id}
            onChange={(e) => set("crm_id", e.target.value)}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Notes</label>
          <input
            type="text"
            placeholder="Flight info, seller contact, etc."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
      {error && (
        <div className="error-msg" style={{ textAlign: "left", marginTop: 8 }}>
          {error}
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ marginTop: 16 }}
        onClick={handleCreate}
        disabled={saving}
      >
        {saving ? "Creating..." : "Create Trip →"}
      </button>
      {saved && (
        <div className="success-toast">
          ✓ Trip created and assigned to driver
        </div>
      )}
    </div>
  );
}

// ─── FINALIZE TRIP MODAL ──────────────────────────────────────────────────────
function FinalizeTripModal({ trip, allProfiles, onFinalized, onClose }) {
  const driver1 = allProfiles.find((p) => p.id === trip.driver_id);
  const driver2 = trip.second_driver_id
    ? allProfiles.find((p) => p.id === trip.second_driver_id)
    : null;
  const duration =
    trip.actual_start && trip.actual_end
      ? (
          (new Date(trip.actual_end) - new Date(trip.actual_start)) /
          3600000
        ).toFixed(1)
      : "";
  const [form, setForm] = useState({
    pay: "",
    pay2: "",
    hours: duration,
    miles: String(trip.miles ?? ""),
    actual_cost: String(trip.actual_cost ?? ""),
    estimated_cost: String(trip.estimated_cost ?? ""),
    recon_missed: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleFinalize() {
    if (!form.pay) {
      setError("Pay is required.");
      return;
    }
    if (driver2 && !form.pay2) {
      setError("Pay for both drivers is required.");
      return;
    }
    setSaving(true);
    setError("");

    // Update trip to finalized
    const { error: tripErr } = await supabase
      .from("trips")
      .update({
        status: "finalized",
        miles: form.miles ? Number(form.miles) : 0,
        actual_cost: form.actual_cost ? Number(form.actual_cost) : 0,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
      })
      .eq("id", trip.id);
    if (tripErr) {
      setError(tripErr.message);
      setSaving(false);
      return;
    }

    // Create entry for driver 1
    const baseEntry = {
      date: (trip.actual_end ? new Date(trip.actual_end) : new Date())
        .toISOString()
        .slice(0, 10),
      city: trip.city,
      crm_id: trip.crm_id,
      carpage_link: trip.carpage_link,
      hours: form.hours ? Number(form.hours) : 0,
      miles: form.miles ? Number(form.miles) : 0,
      actual_cost: form.actual_cost ? Number(form.actual_cost) : 0,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
      recon_missed: form.recon_missed,
      trip_id: trip.id,
    };
    await supabase.from("entries").insert({
      ...baseEntry,
      driver_id: trip.driver_id,
      pay: Number(form.pay),
    });

    // Create identical entry for driver 2 if drive trip
    if (driver2) {
      await supabase.from("entries").insert({
        ...baseEntry,
        driver_id: trip.second_driver_id,
        pay: Number(form.pay2),
      });
    }

    setSaving(false);
    onFinalized(trip.id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">Finalize Trip</div>
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {trip.crm_id} — {trip.city}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {driver1?.name}
            {driver2 ? ` + ${driver2.name}` : ""} ·{" "}
            {trip.trip_type === "fly" ? "✈ Fly" : "🚗 Drive"}
            {trip.actual_start && trip.actual_end && (
              <span style={{ marginLeft: 12 }}>⏱ {duration}h recorded</span>
            )}
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Pay — {driver1?.name} ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.pay}
              onChange={(e) => set("pay", e.target.value)}
              autoFocus
            />
          </div>
          {driver2 && (
            <div className="field">
              <label>Pay — {driver2?.name} ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.pay2}
                onChange={(e) => set("pay2", e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>Hours Worked</label>
            <input
              type="number"
              placeholder="0"
              value={form.hours}
              onChange={(e) => set("hours", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Miles Driven</label>
            <input
              type="number"
              placeholder="0"
              value={form.miles}
              onChange={(e) => set("miles", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Actual Cost ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.actual_cost}
              onChange={(e) => set("actual_cost", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Estimated Cost ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.estimated_cost}
              onChange={(e) => set("estimated_cost", e.target.value)}
            />
          </div>
        </div>
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="fin-recon"
            checked={form.recon_missed}
            onChange={(e) => set("recon_missed", e.target.checked)}
          />
          <label
            htmlFor="fin-recon"
            style={{
              color: form.recon_missed ? "var(--danger)" : "var(--text)",
            }}
          >
            Recon was missed on this vehicle
          </label>
        </div>
        {error && (
          <div className="error-msg" style={{ textAlign: "left" }}>
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button
            className="btn btn-ghost"
            style={{ padding: "8px 16px", fontSize: 12 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: 12 }}
            onClick={handleFinalize}
            disabled={saving}
          >
            {saving ? "Saving..." : "Finalize & Create Log Entries →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN TRIPS ──────────────────────────────────────────────────────────────
function AdminTrips({
  drivers,
  allProfiles,
  trips,
  setTrips,
  setEntries,
  prefillData,
  onPrefillConsumed,
}) {
  const [view, setView] = useState(prefillData ? "create" : "active"); // active | all | create
  const [finalizingTrip, setFinalizingTrip] = useState(null);
  const [acting, setActing] = useState(null); // trip id being acted on

  async function handleEndTrip(trip) {
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "completed", actual_end: new Date().toISOString() })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data)
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
  }

  const active = trips.filter((t) =>
    ["pending", "in_progress", "completed"].includes(t.status),
  );
  const all = trips;
  const displayed = view === "create" ? [] : view === "active" ? active : all;

  function getDriverNames(trip) {
    const p1 = allProfiles.find((p) => p.id === trip.driver_id);
    const p2 = trip.second_driver_id ? allProfiles.find((p) => p.id === trip.second_driver_id) : null;
    const n1 = p1 ? `${p1.name}${p1.willing_to_fly ? ' (F)' : ''}` : "—";
    const n2 = p2 ? `${p2.name}${p2.willing_to_fly ? ' (F)' : ''}` : null;
    return n2 ? `${n1} + ${n2}` : n1;
  }

  function handleFinalized(tripId) {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: "finalized" } : t)),
    );
    setFinalizingTrip(null);
    // Reload entries so new log entries appear
    supabase
      .from("entries")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data);
      });
  }

  return (
    <div className="fade-in">
      {finalizingTrip && (
        <FinalizeTripModal
          trip={finalizingTrip}
          allProfiles={allProfiles}
          onFinalized={handleFinalized}
          onClose={() => setFinalizingTrip(null)}
        />
      )}

      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        {[
          ["active", `Active (${active.length})`],
          ["all", `All Trips (${all.length})`],
          ["create", "＋ Create Trip"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={`btn ${view === v ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "8px 18px", fontSize: 12 }}
            onClick={() => setView(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "create" && (
        <CreateTrip
          drivers={drivers}
          onCreated={(t) => {
            setTrips((prev) => [t, ...prev]);
            setView("active");
          }}
          prefillData={prefillData}
          onPrefillConsumed={onPrefillConsumed}
        />
      )}

      {view !== "create" && (
        <div className="table-wrap">
          <div className="table-head">
            <div className="table-head-title">
              {view === "active" ? "Active Trips" : "All Trips"}
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {displayed.length} trips
            </span>
          </div>
          {displayed.length === 0 ? (
            <div style={{ padding: 24, color: "var(--muted)", fontSize: 14 }}>
              No trips found. Create one to get started.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Driver(s)</th>
                  <th>CRM ID</th>
                  <th>City</th>
                  <th>Pickup</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...displayed]
                  .sort(
                    (a, b) =>
                      new Date(b.scheduled_pickup) -
                      new Date(a.scheduled_pickup),
                  )
                  .map((trip) => (
                    <tr key={trip.id}>
                      <td>
                        <TripStatusBadge status={trip.status} />
                      </td>
                      <td>{trip.trip_type === "fly" ? "✈ Fly" : "🚗 Drive"}</td>
                      <td style={{ fontWeight: 600 }}>
                        {getDriverNames(trip)}
                      </td>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {trip.carpage_link ? (
                          <a
                            href={trip.carpage_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--accent)",
                              textDecoration: "none",
                            }}
                          >
                            {trip.crm_id} ↗
                          </a>
                        ) : (
                          trip.crm_id
                        )}
                      </td>
                      <td>{trip.city}</td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>
                        {new Date(trip.scheduled_pickup).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}{" "}
                        {new Date(trip.scheduled_pickup).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit" },
                        )}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>
                        {trip.actual_start
                          ? new Date(trip.actual_start).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit" },
                            )
                          : "—"}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>
                        {trip.actual_end
                          ? new Date(trip.actual_end).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit" },
                            )
                          : "—"}
                      </td>
                      <td>
                        {trip.status === "in_progress" && (
                          <button
                            className="btn-edit"
                            style={{
                              background: "rgba(232,90,74,0.1)",
                              color: "var(--danger)",
                              borderColor: "var(--danger)",
                            }}
                            onClick={() => handleEndTrip(trip)}
                            disabled={acting === trip.id}
                          >
                            {acting === trip.id ? "Ending..." : "⏹ End Trip"}
                          </button>
                        )}
                        {trip.status === "completed" && (
                          <button
                            className="btn-edit"
                            style={{
                              background: "rgba(74,232,133,0.1)",
                              color: "var(--success)",
                              borderColor: "var(--success)",
                            }}
                            onClick={() => setFinalizingTrip(trip)}
                          >
                            Finalize
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DRIVER TRIPS ─────────────────────────────────────────────────────────────
function DriverTrips({ driver, trips, setTrips }) {
  const [acting, setActing] = useState(null); // trip id being acted on

  const isDesignated = (trip) => trip.designated_driver_id === driver.id;
  const myTrips = trips.filter(
    (t) => t.driver_id === driver.id || t.second_driver_id === driver.id,
  );
  const pending = myTrips.filter((t) => t.status === "pending");
  const inProgress = myTrips.filter((t) => t.status === "in_progress");
  const recent = myTrips
    .filter((t) => ["completed", "finalized"].includes(t.status))
    .slice(0, 5);

  async function handleStart(trip) {
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "in_progress", actual_start: new Date().toISOString() })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data)
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
  }

  async function handleEnd(trip) {
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "completed", actual_end: new Date().toISOString() })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data)
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
  }

  function TripCard({ trip, showControls }) {
    const isActive = trip.status === "in_progress";
    const borderColor = isActive ? "var(--accent)" : STATUS_COLORS[trip.status];
    const canControl = showControls && isDesignated(trip);
    return (
      <div
        style={{
          border: `1px solid var(--border)`,
          borderLeft: `3px solid ${borderColor}`,
          background: "var(--bg)",
          padding: "16px 20px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {trip.crm_id}
              </span>
              <TripStatusBadge status={trip.status} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {trip.trip_type === "fly" ? "✈ Fly" : "🚗 Drive"}
              </span>
            </div>
            <div
              style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}
            >
              📍 {trip.city}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Pickup:{" "}
              {new Date(trip.scheduled_pickup).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              @{" "}
              {new Date(trip.scheduled_pickup).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            {trip.notes && (
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}
              >
                📝 {trip.notes}
              </div>
            )}
            {isActive && trip.actual_start && (
              <div
                style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}
              >
                ⏱ Started at{" "}
                {new Date(trip.actual_start).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
            {trip.status === "completed" && trip.actual_end && (
              <div
                style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}
              >
                ✓ Ended at{" "}
                {new Date(trip.actual_end).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                — waiting for admin to finalize
              </div>
            )}
          </div>
          {canControl && (
            <div>
              {trip.status === "pending" && (
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "8px 18px" }}
                  onClick={() => handleStart(trip)}
                  disabled={acting === trip.id}
                >
                  {acting === trip.id ? "Starting..." : "▶ Start Trip"}
                </button>
              )}
              {trip.status === "in_progress" && (
                <button
                  className="btn"
                  style={{
                    fontSize: 12,
                    padding: "8px 18px",
                    background: "var(--danger)",
                    color: "#fff",
                  }}
                  onClick={() => handleEnd(trip)}
                  disabled={acting === trip.id}
                >
                  {acting === trip.id ? "Ending..." : "⏹ End Trip"}
                </button>
              )}
            </div>
          )}
          {showControls && !canControl && trip.status === "pending" && (
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                padding: "6px 12px",
                border: "1px solid var(--border)",
              }}
            >
              Waiting for designated driver to start
            </div>
          )}
        </div>
      </div>
    );
  }

  if (myTrips.length === 0) {
    return (
      <div
        className="form-card fade-in"
        style={{ textAlign: "center", padding: 40 }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🚗</div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          No trips assigned yet. Check back when your manager sets one up.
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {inProgress.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 12,
            }}
          >
            ▶ In Progress
          </div>
          {inProgress.map((t) => (
            <TripCard key={t.id} trip={t} showControls={true} />
          ))}
        </>
      )}
      {pending.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 12,
              marginTop: inProgress.length ? 24 : 0,
            }}
          >
            Upcoming
          </div>
          {pending.map((t) => (
            <TripCard key={t.id} trip={t} showControls={true} />
          ))}
        </>
      )}
      {recent.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 12,
              marginTop: 24,
            }}
          >
            Recent
          </div>
          {recent.map((t) => (
            <TripCard key={t.id} trip={t} showControls={false} />
          ))}
        </>
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
      const { data } = await supabase
        .from("availability")
        .select("*")
        .eq("week_start", weekStart);
      setRecords(data ?? []);
      setLoading(false);
    }
    load();
  }, [weekStart]);

  const submitted = new Set(records.map((r) => r.driver_id));

  if (loading)
    return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        Week of {getNextWeekLabel()}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
        {submitted.size} of {drivers.length} drivers have submitted availability
      </div>

      {/* Not submitted warning */}
      {drivers.filter((d) => !submitted.has(d.id)).length > 0 && (
        <div
          style={{
            background: "rgba(255,82,82,0.08)",
            border: "1px solid rgba(255,82,82,0.25)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: "var(--danger)",
              marginBottom: 8,
            }}
          >
            ⚠ HAVEN'T SUBMITTED
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {drivers
              .filter((d) => !submitted.has(d.id))
              .map((d) => (
                <span
                  key={d.id}
                  style={{
                    background: "rgba(255,82,82,0.15)",
                    borderRadius: 4,
                    padding: "3px 10px",
                    fontSize: 12,
                    color: "var(--danger)",
                  }}
                >
                  {d.name}
                </span>
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
              {DAY_LABELS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const rec = records.find((r) => r.driver_id === driver.id);
              return (
                <tr key={driver.id}>
                  <td style={{ fontWeight: 600 }}>
                    {driver.name}
                    {driver.willing_to_fly && <span style={{ color: "var(--accent)", marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(F)</span>}
                    {rec?.updated_after_saturday && (
                      <span
                        title={`Amended — Reason: ${rec.update_reason}`}
                        style={{
                          marginLeft: 6,
                          color: "var(--accent)",
                          fontSize: 12,
                          cursor: "help",
                        }}
                      >
                        ⚠ amended
                      </span>
                    )}
                    {rec?.updated_after_saturday && rec.update_reason && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          fontWeight: 400,
                          marginTop: 2,
                        }}
                      >
                        "{rec.update_reason}"
                      </div>
                    )}
                  </td>
                  {DAYS.map((d) => (
                    <td key={d} style={{ textAlign: "center" }}>
                      {!rec ? (
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>
                          —
                        </span>
                      ) : rec[d] ? (
                        <div>
                          <span
                            style={{
                              color: "var(--success)",
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            ✓
                          </span>
                          {rec[`${d}_done_by`] && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--muted)",
                                marginTop: 2,
                              }}
                            >
                              {rec[`${d}_done_by`].slice(0, 5)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--danger)", fontSize: 14 }}>
                          ✗
                        </span>
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
  const [trips, setTrips] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
  const [driverTab, setDriverTab] = useState("overview");
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profile) setUser({ ...profile, email: session.user.email });
      }
      setAppLoading(false);

      const params = new URLSearchParams(window.location.search);
      const prefill = params.get("prefill");
      if (prefill) {
        try {
          setPrefillData(JSON.parse(decodeURIComponent(prefill)));
          window.history.replaceState({}, "", window.location.pathname);
        } catch {}
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setEntries([]);
        setAllProfiles([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    async function loadData() {
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (profiles) setAllProfiles(profiles);

      let query = supabase
        .from("entries")
        .select("*")
        .order("date", { ascending: false });
      if (user.role === "driver") query = query.eq("driver_id", user.id);
      const { data: entryData } = await query;
      if (entryData) setEntries(entryData);

      let tripQuery = supabase
        .from("trips")
        .select("*")
        .order("scheduled_pickup", { ascending: false });
      if (user.role === "driver")
        tripQuery = tripQuery.or(
          `driver_id.eq.${user.id},second_driver_id.eq.${user.id}`,
        );
      const { data: tripData } = await tripQuery;
      if (tripData) setTrips(tripData);
    }
    loadData();
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
    setAllProfiles([]);
    setTrips([]);
    setDriverTab("overview");
  }

  if (appLoading) {
    return (
      <div
        style={{
          background: "#0d0f12",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 20,
          letterSpacing: 3,
          color: "#6b7585",
        }}
      >
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
          {user.role === "driver" ? (
            <DriverDashboard
              driver={user}
              entries={driverEntries}
              trips={trips}
              setTrips={setTrips}
              tab={driverTab}
              setTab={setDriverTab}
            />
          ) : (
            <AdminDashboard
              allProfiles={allProfiles}
              setAllProfiles={setAllProfiles}
              entries={entries}
              setEntries={setEntries}
              trips={trips}
              setTrips={setTrips}
              prefillData={prefillData}
              onPrefillConsumed={() => setPrefillData(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
