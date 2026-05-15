import { useState, useEffect, useRef, Fragment } from "react";
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
  tripTypeLabel,
  aaGroupLabel,
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
    --bg: #0a0c10;
    --surface: #13161c;
    --surface2: #1a1e26;
    --border: #232a36;
    --border-light: #2e3748;
    --accent: #e8b44a;
    --accent2: #3b8cf7;
    --danger: #e85a4a;
    --success: #4ae885;
    --text: #eaeff4;
    --muted: #5e6878;
    --font-head: 'Barlow Condensed', sans-serif;
    --font-body: 'Barlow', sans-serif;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2);
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, var(--border) 39px, var(--border) 40px),
                      repeating-linear-gradient(90deg, transparent, transparent 39px, var(--border) 39px, var(--border) 40px);
  }
  .login-card {
    background: var(--surface); border: 1px solid var(--border); width: 400px;
    padding: 48px; position: relative; box-shadow: var(--shadow-lg);
    animation: fadeUp 0.4s ease; border-radius: var(--radius-lg);
  }
  .login-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .login-logo { font-family: var(--font-head); font-size: 32px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }
  .login-sub { color: var(--muted); font-size: 13px; margin-bottom: 36px; letter-spacing: 0.3px; }
  .field { margin-bottom: 20px; }
  .field label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .field input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
    padding: 11px 14px; font-family: var(--font-body); font-size: 14px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s; border-radius: var(--radius-sm);
  }
  .field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,180,74,0.1); }
  .field input::placeholder { color: var(--muted); opacity: 0.5; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px 22px; font-family: var(--font-head); font-size: 13px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; border: none;
    transition: all 0.2s ease-out; white-space: nowrap; border-radius: var(--radius-sm);
  }
  .btn-primary { background: var(--accent); color: #0a0c10; box-shadow: 0 2px 8px rgba(232,180,74,0.18); }
  .btn-primary:hover { background: #f2c65e; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,180,74,0.28); }
  .btn-primary:active { transform: scale(0.97); box-shadow: 0 1px 4px rgba(232,180,74,0.15); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .btn-ghost { background: rgba(255,255,255,0.03); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); background: rgba(232,180,74,0.06); }
  .btn-ghost:active { transform: scale(0.97); }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; font-family: var(--font-head); font-size: 12px; font-weight: 700;
    letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
    background: var(--surface2); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); transition: all 0.2s;
  }
  .btn-secondary:hover { border-color: var(--accent2); color: var(--accent2); background: rgba(59,140,247,0.08); }
  .btn-secondary:active { transform: scale(0.97); }
  .btn-block { width: 100%; }
  .error-msg { color: var(--danger); font-size: 13px; margin-top: 14px; text-align: center; }

  .topbar {
    background: rgba(19,22,28,0.85); border-bottom: 1px solid var(--border);
    padding: 0 36px; height: 56px; display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.4);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  .topbar-logo { font-family: var(--font-head); font-size: 21px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; }
  .topbar-logo span { color: var(--accent); }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .topbar-user { font-size: 13px; color: var(--muted); letter-spacing: 0.2px; }
  .topbar-user strong { color: var(--text); font-weight: 600; }

  .page { padding: 40px 36px; max-width: 1320px; margin: 0 auto; width: 100%; }
  .page-title { font-family: var(--font-head); font-size: 34px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 6px; line-height: 1.1; }
  .page-sub { color: var(--muted); font-size: 14px; margin-bottom: 28px; letter-spacing: 0.2px; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 16px; margin-bottom: 36px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border); padding: 22px 24px;
    position: relative; overflow: hidden; animation: fadeUp 0.3s ease both;
    border-radius: var(--radius-md); transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
    box-shadow: var(--shadow-sm);
  }
  .stat-card:hover { border-color: var(--border-light); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .stat-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
    background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform 0.4s ease;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }
  .stat-card:hover::after { transform: scaleX(1); }
  .stat-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .stat-value { font-family: var(--font-head); font-size: 30px; font-weight: 800; line-height: 1; }
  .stat-value.accent { color: var(--accent); }
  .stat-value.success { color: var(--success); }
  .stat-value.blue { color: var(--accent2); }
  .stat-value.danger { color: var(--danger); }
  .stat-sub { font-size: 11px; color: var(--muted); margin-top: 6px; letter-spacing: 0.2px; }

  .bonus-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 36px; }
  .bonus-card { background: var(--surface); border: 1px solid var(--border); padding: 24px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); transition: border-color 0.25s, box-shadow 0.25s; }
  .bonus-card:hover { border-color: var(--border-light); box-shadow: var(--shadow-md); }
  .bonus-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .bonus-title { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
  .bonus-earned { font-size: 10px; font-weight: 700; background: var(--success); color: #0a0c10; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.5px; }
  .progress-bar { background: var(--bg); height: 6px; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; transition: width 0.6s ease; border-radius: 3px; }
  .progress-fill.trips { background: linear-gradient(90deg, var(--accent2), var(--accent)); }
  .progress-fill.recon { background: linear-gradient(90deg, var(--success), #3bf890); }
  .bonus-count { font-family: var(--font-head); font-size: 28px; font-weight: 800; margin-top: 10px; }
  .bonus-desc { font-size: 12px; color: var(--muted); margin-top: 4px; letter-spacing: 0.2px; }

  .table-wrap { background: var(--surface); border: 1px solid var(--border); overflow: hidden; margin-bottom: 36px; overflow-x: auto; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
  .table-head { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .table-head-title { font-family: var(--font-head); font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; background: rgba(255,255,255,0.015); }
  td { padding: 14px 16px; font-size: 13.5px; border-bottom: 1px solid rgba(35,42,54,0.6); transition: background 0.15s; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.025); }
  tbody tr:nth-child(even) td { background: rgba(255,255,255,0.01); }
  tbody tr:nth-child(even):hover td { background: rgba(255,255,255,0.035); }
  .badge { display: inline-block; padding: 3px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; }
  .badge-ok { background: rgba(74,232,133,0.1); color: var(--success); }
  .badge-miss { background: rgba(232,90,74,0.1); color: var(--danger); }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 10000;
    display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border); width: 500px; max-width: 95vw;
    max-height: 90vh; overflow-y: auto;
    padding: 32px; position: relative; box-shadow: var(--shadow-lg); animation: fadeUp 0.2s ease;
    border-radius: var(--radius-lg);
  }
  .modal::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .modal-title { font-family: var(--font-head); font-size: 20px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  .modal-actions { display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; }
  .btn-edit { background: transparent; color: var(--accent2); border: 1px solid var(--accent2); padding: 5px 12px; font-family: var(--font-head); font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; border-radius: var(--radius-sm); margin-right: 6px; }
  .btn-edit:hover { background: var(--accent2); color: #0a0c10; }
  .btn-edit:active { transform: scale(0.96); }

  .report-section { background: var(--surface); border: 1px solid var(--border); padding: 28px; margin-bottom: 28px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
  .report-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .report-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(35,42,54,0.5); font-size: 14px; flex-wrap: wrap; gap: 8px; }
  .report-row:last-child { border-bottom: none; }
  .report-total { display: flex; justify-content: space-between; padding: 16px 0 0; margin-top: 4px; font-family: var(--font-head); font-size: 20px; font-weight: 700; color: var(--accent); border-top: 1px solid var(--border); }

  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; padding: 0; border: none; }
  .tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; font-family: var(--font-head); font-size: 12px; font-weight: 700;
    letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer;
    color: var(--muted); background: rgba(255,255,255,0.025);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    transition: all 0.2s ease-out; white-space: nowrap;
  }
  .tab:hover { color: var(--text); background: rgba(255,255,255,0.055); border-color: var(--border-light); transform: translateY(-1px); }
  .tab.active { color: var(--accent); background: rgba(232,180,74,0.07); border-color: rgba(232,180,74,0.25); box-shadow: 0 0 12px rgba(232,180,74,0.08); }
  .tab .tab-icon { font-size: 13px; line-height: 1; opacity: 0.85; }
  .tab.active .tab-icon { opacity: 1; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .form-card { background: var(--surface); border: 1px solid var(--border); padding: 32px; margin-bottom: 32px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
  .form-card-title { font-family: var(--font-head); font-size: 17px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
  .field select {
    width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
    padding: 11px 14px; font-family: var(--font-body); font-size: 14px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s; appearance: none; border-radius: var(--radius-sm);
  }
  .field select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,180,74,0.1); }
  .checkbox-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; cursor: pointer; transition: opacity 0.15s; }
  .checkbox-row:hover { opacity: 0.85; }
  .checkbox-row input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; border-radius: 4px; flex-shrink: 0; }
  .checkbox-row label { font-size: 14px; cursor: pointer; letter-spacing: 0.2px; }
  .success-toast { background: rgba(74,232,133,0.06); border: 1px solid rgba(74,232,133,0.25); color: var(--success); padding: 14px 18px; margin-top: 20px; font-size: 13px; font-weight: 600; animation: fadeUp 0.3s ease; border-radius: var(--radius-sm); }

  .driver-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 36px; }
  .driver-card {
    background: var(--surface); border: 1px solid var(--border); padding: 22px 24px;
    cursor: pointer; transition: all 0.25s ease-out; position: relative; overflow: hidden;
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
  }
  .driver-card:hover { border-color: rgba(232,180,74,0.3); transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
  .driver-card:active { transform: translateY(-1px); }
  .driver-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; bottom: 0; background: var(--accent2); transition: width 0.2s; }
  .driver-card:hover::before { width: 4px; background: var(--accent); }
  .driver-name { font-family: var(--font-head); font-size: 19px; font-weight: 700; letter-spacing: 1px; }
  .driver-meta { font-size: 12px; color: var(--muted); margin-top: 6px; letter-spacing: 0.2px; }
  .driver-pay { font-family: var(--font-head); font-size: 28px; font-weight: 800; color: var(--accent); margin-top: 14px; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-in { animation: fadeUp 0.3s ease both; }
  .fade-in-1 { animation-delay: 0.05s; }
  .fade-in-2 { animation-delay: 0.1s; }
  .fade-in-3 { animation-delay: 0.15s; }
  .fade-in-4 { animation-delay: 0.2s; }
  .fade-in-5 { animation-delay: 0.25s; }

  @media (max-width: 640px) {
    .page { padding: 20px 16px; }
    .bonus-section { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; gap: 16px; }
    .stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
    .topbar { padding: 0 16px; }
    .driver-detail-grid { grid-template-columns: 1fr; }
    .driver-grid { grid-template-columns: 1fr; }
    .page-title { font-size: 26px; }
    .tabs { gap: 6px; }
    .tab { padding: 7px 12px; font-size: 11px; }
    .stat-card { padding: 16px 18px; }
    .form-card { padding: 20px; }
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }
  .form-group label {
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .form-group input,
  .form-group select {
    padding: 11px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .form-group input::placeholder { color: var(--muted); opacity: 0.5; }
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(232,180,74,0.1);
  }

  .driver-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .detail-section {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 24px 28px;
    box-shadow: var(--shadow-sm);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .detail-section:hover { border-color: var(--border-light); box-shadow: var(--shadow-md); }
  .detail-section h3 {
    margin: 0 0 18px 0;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--accent);
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { font-size: 12px; color: var(--muted); font-weight: 600; letter-spacing: 0.3px; }
  .detail-value { font-size: 14px; color: var(--text); font-weight: 500; }

  .error-banner {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.4);
    color: rgb(239,68,68);
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    animation: fadeUp 0.2s ease;
  }
  .success-banner {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.4);
    color: rgb(34,197,94);
    padding: 12px 16px;
    border-radius: 8px;
    animation: fadeUp 0.2s ease;
    margin-bottom: 16px;
  }

  .btn-danger {
    background: var(--danger);
    color: white;
    border: none;
    padding: 11px 22px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 700;
    font-family: var(--font-head);
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: all 0.2s ease-out;
    box-shadow: 0 2px 8px rgba(232,90,74,0.2);
  }
  .btn-danger:hover { background: #d44a3a; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,90,74,0.3); }
  .btn-danger:active { transform: scale(0.97); box-shadow: 0 1px 4px rgba(232,90,74,0.15); }
  .btn-danger:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
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
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <a href="https://apps.apple.com/us/app/discovery-driver-portal/id6760372806" target="_blank" rel="noreferrer">
            <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us" alt="Download on the App Store" style={{ height: 40 }} />
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.cameronoberlies.driverpay" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", height: 40 }}>
            <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style={{ height: 60, marginTop: -10, marginBottom: -10 }} />
          </a>
        </div>
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
function NotificationWarningBanner({ profiles }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const drivers = (profiles || []).filter(p => ["driver", "manager"].includes(p.role) && !p.push_token);
  if (drivers.length === 0) return null;
  const names = drivers.map(d => d.name).join(", ");
  return (
    <div style={{
      background: "rgba(232,90,74,0.15)",
      borderBottom: "2px solid var(--danger)",
      color: "var(--danger)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      fontWeight: 700,
    }}>
      <div>
        ⚠️ {drivers.length} driver{drivers.length !== 1 ? "s" : ""} {drivers.length === 1 ? "has" : "have"} notifications disabled — tracking will fail on their trips: <span style={{ fontWeight: 500 }}>{names}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}
      >
        DISMISS
      </button>
    </div>
  );
}

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
            {["admin", "manager", "caller"].includes(user.role) && (
              <span
                style={{
                  color: user.role === "admin" ? "var(--accent)" : "var(--accent2)",
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {user.role.toUpperCase()}
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
        <DriverTrips driver={driver} trips={trips} setTrips={setTrips} allProfiles={profiles} />
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
            href="https://apps.apple.com/us/app/discovery-driver-portal/id6760372806"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid #3b8cf7",
              padding: "16px 24px",
              marginBottom: 12,
              textDecoration: "none",
              color: "var(--text)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us" alt="Download on the App Store" style={{ height: 40 }} />
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.cameronoberlies.driverpay"
            target="_blank"
            rel="noopener noreferrer"
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
              borderRadius: "var(--radius-sm)",
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
                Get it on Google Play
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
            Driver Missed Recon (resets bonus streak)
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
function exportCSV(entries, profiles, canSeePay = true) {
  const csv = buildCSVContent(entries, profiles, canSeePay);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `driverpay-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── MINI LINE CHART (SVG) ────────────────────────────────────────────────────
function MiniLineChart({ datasets, labels, height = 200 }) {
  const padding = { top: 20, right: 16, bottom: 32, left: 56 };
  const w = 600;
  const h = height;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const allValues = datasets.flatMap((ds) => ds.data);
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  function toX(i, len) { return padding.left + (i / (len - 1)) * plotW; }
  function toY(v) { return padding.top + plotH - ((v - minVal) / range) * plotH; }

  const gridLines = 4;
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) => minVal + (range / gridLines) * i);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      {/* Grid lines */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padding.left} y1={toY(v)} x2={w - padding.right} y2={toY(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={padding.left - 8} y={toY(v) + 4} fill="var(--muted)" fontSize="10" fontWeight="700" textAnchor="end" fontFamily="var(--font-body)">
            ${Math.round(v)}
          </text>
        </g>
      ))}
      {/* X labels */}
      {labels.map((label, i) => (
        <text key={i} x={toX(i, labels.length)} y={h - 6} fill="var(--muted)" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="var(--font-body)">
          {label}
        </text>
      ))}
      {/* Lines */}
      {datasets.map((ds, di) => {
        const points = ds.data.map((v, i) => `${toX(i, ds.data.length)},${toY(v)}`).join(" ");
        return (
          <g key={di}>
            <polyline fill="none" stroke={ds.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points} />
            {ds.data.map((v, i) => (
              <circle key={i} cx={toX(i, ds.data.length)} cy={toY(v)} r="3.5" fill={ds.color} stroke="var(--surface)" strokeWidth="2" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── MINI PIE CHART (SVG) ─────────────────────────────────────────────────────
function MiniPieChart({ data }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle = (d.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="var(--surface)" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MILEAGE COST REPORT ──────────────────────────────────────────────────────
const MILEAGE_RANGE_OPTIONS = ["1W", "1M", "3M", "6M", "1Y"];

// Bucket helper: drives KPI window and trend chart x-axis points.
// 1W=7 daily, 1M=4 weekly, 3M=12 weekly, 6M=6 monthly, 1Y=12 monthly.
function getMileageRangeBuckets(range) {
  const now = new Date();
  const buckets = [];

  if (range === "1W") {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      buckets.push({ start, end, label: start.toLocaleDateString("en-US", { weekday: "short" }) });
    }
  } else if (range === "1M") {
    for (let i = 3; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
      buckets.push({ start, end, label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    }
  } else if (range === "3M") {
    for (let i = 11; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
      buckets.push({ start, end, label: i % 3 === 0 ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "" });
    }
  } else if (range === "6M") {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      buckets.push({ start, end, label: start.toLocaleDateString("en-US", { month: "short" }) });
    }
  } else { // 1Y
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      buckets.push({ start, end, label: i % 2 === 0 ? start.toLocaleDateString("en-US", { month: "short" }) : "" });
    }
  }

  return { rangeStart: buckets[0].start, rangeEnd: buckets[buckets.length - 1].end, buckets };
}

function MileageCostReport({
  entries,
  drivers,
  allProfiles,
  trips,
}) {
  const [range, setRange] = useState("1W");
  const [selectedDriver, setSelectedDriver] = useState("all");
  const [activeChart, setActiveChart] = useState(0);

  const { rangeStart, rangeEnd, buckets } = getMileageRangeBuckets(range);

  const filtered = entries.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    const inPeriod = d >= rangeStart && d <= rangeEnd;
    const inDriver = selectedDriver === "all" || e.driver_id === selectedDriver;
    return inPeriod && inDriver;
  });

  const weekFiltered = entries.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    return d >= rangeStart && d <= rangeEnd;
  });

  const totalActual = filtered.reduce((s, e) => s + Number(e.actual_cost ?? 0), 0);
  const totalEstimated = filtered.reduce((s, e) => s + Number(e.estimated_cost ?? 0), 0);
  const totalMiles = filtered.reduce((s, e) => s + Number(e.miles ?? 0), 0);
  // Turned down trips: actual cost counts but estimated doesn't (no vehicle bought)
  const turnedDownCost = filtered.filter(e => e.turned_down).reduce((s, e) => s + Number(e.actual_cost ?? 0), 0);
  const turnedDownEstimated = filtered.filter(e => e.turned_down).reduce((s, e) => s + Number(e.estimated_cost ?? 0), 0);
  // Additional recon: unexpected repair costs deducted from variance pool
  const additionalReconTotal = filtered.reduce((s, e) => s + Number(e.additional_recon_cost ?? 0), 0);
  // Variance = (actual - estimated) for purchased vehicles + turned down loss + additional recon
  const variance = (totalActual - totalEstimated) + turnedDownEstimated + additionalReconTotal;

  const sameYear = rangeStart.getFullYear() === rangeEnd.getFullYear();
  const periodLabel = `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" })} – ${rangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // ── Bucketed entry aggregates: one pass, all trend charts read from it ──
  const bucketAggregates = buckets.map((b) => {
    const inBucket = entries.filter((e) => {
      const d = new Date(e.date + "T12:00:00");
      return d >= b.start && d <= b.end;
    });
    const miles = inBucket.reduce((t, e) => t + Number(e.miles ?? 0), 0);
    const actual = inBucket.reduce((t, e) => t + Number(e.actual_cost ?? 0), 0);
    const estimated = inBucket.reduce((t, e) => t + Number(e.estimated_cost ?? 0), 0);
    return { label: b.label, miles, actual, estimated, cpm: miles > 0 ? parseFloat((actual / miles).toFixed(2)) : 0 };
  });

  // ── Chart 1: Cost Variance Trend ──
  const varianceTrend = bucketAggregates;

  // ── Chart 2: Mileage Trend ──
  const milesTrend = bucketAggregates;

  // ── Chart 3: Cost per Mile ──
  const totalCostPerMile = totalMiles > 0 ? totalActual / totalMiles : 0;
  const efficiencyTrend = bucketAggregates;

  // ── Chart 4: Trip Type Breakdown (pie) ──
  const tripTypeData = (() => {
    const rangeTrips = (trips ?? []).filter((t) => {
      if (!t.actual_start) return false;
      const d = new Date(t.actual_start);
      return d >= rangeStart && d <= rangeEnd;
    });
    const flyCount = rangeTrips.filter((t) => t.trip_type === "fly").length;
    const driveCount = rangeTrips.filter((t) => t.trip_type === "drive").length;
    if (flyCount === 0 && driveCount === 0) return [];
    return [
      flyCount > 0 && { label: `Fly (${flyCount})`, value: flyCount, color: "var(--accent2)" },
      driveCount > 0 && { label: `Drive (${driveCount})`, value: driveCount, color: "var(--accent)" },
    ].filter(Boolean);
  })();

  // ── Chart 5: Speed by Driver Over Time (within range, OBD trips only) ──
  const [speedDriver, setSpeedDriver] = useState("all");
  const speedData = (() => {
    const tripsWithSpeed = (trips ?? [])
      .filter(t => t.obd_data?.max_speed != null && t.actual_start)
      .filter(t => {
        const d = new Date(t.actual_start);
        return d >= rangeStart && d <= rangeEnd;
      })
      .filter(t => speedDriver === "all" || t.driver_id === speedDriver || t.designated_driver_id === speedDriver)
      .sort((a, b) => new Date(a.actual_start) - new Date(b.actual_start))
      .slice(-20);
    return tripsWithSpeed;
  })();

  const chartTabs = [
    { key: 0, label: "TREND" },
    { key: 1, label: "MILES" },
    { key: 2, label: "EFFICIENCY" },
    { key: 3, label: "TYPES" },
    // { key: 4, label: "SPEED" }, // Disabled until OBD2
  ];

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
            <div style={{ display: "flex", gap: 6 }}>
              {MILEAGE_RANGE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: range === r ? "rgba(232,180,74,0.15)" : "var(--bg)",
                    border: `1px solid ${range === r ? "rgba(232,180,74,0.4)" : "var(--border)"}`,
                    color: range === r ? "var(--accent)" : "var(--muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    fontFamily: "var(--font-head)",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "10px 16px", fontSize: 12 }}
            onClick={() => exportCSV(filtered, allProfiles, canSeePay)}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Miles", value: totalMiles.toFixed(1) + " mi", cls: "", sub: periodLabel },
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

      {/* Chart Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {chartTabs.map((ct) => (
          <button
            key={ct.key}
            onClick={() => setActiveChart(ct.key)}
            style={{
              flex: 1,
              padding: "10px 0",
              background: activeChart === ct.key ? "rgba(232,180,74,0.1)" : "var(--surface)",
              border: `1px solid ${activeChart === ct.key ? "rgba(232,180,74,0.3)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              color: activeChart === ct.key ? "var(--accent)" : "var(--muted)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              fontFamily: "var(--font-head)",
              cursor: "pointer",
              transition: "all 0.15s",
              textTransform: "uppercase",
            }}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 24, marginBottom: 28 }}>
        {activeChart === 0 && (
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 2, fontWeight: 700, marginBottom: 16, textAlign: "center", textTransform: "uppercase" }}>
              Cost Variance Trend
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 3, borderRadius: 2, background: "var(--danger)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Actual</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 3, borderRadius: 2, background: "var(--accent)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Estimated</span>
              </div>
            </div>
            <MiniLineChart
              labels={varianceTrend.map((w) => w.label)}
              datasets={[
                { data: varianceTrend.map((w) => w.actual), color: "var(--danger)" },
                { data: varianceTrend.map((w) => w.estimated), color: "var(--accent)" },
              ]}
            />
          </div>
        )}

        {activeChart === 1 && (
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 2, fontWeight: 700, marginBottom: 16, textAlign: "center", textTransform: "uppercase" }}>
              Mileage Trend
            </div>
            <MiniLineChart
              labels={milesTrend.map((w) => w.label)}
              datasets={[
                { data: milesTrend.map((w) => w.miles), color: "var(--accent2)" },
              ]}
            />
          </div>
        )}

        {activeChart === 2 && (
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 2, fontWeight: 700, marginBottom: 16, textAlign: "center", textTransform: "uppercase" }}>
              Cost per Mile
            </div>
            <div style={{ textAlign: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, fontWeight: 700 }}>{range}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--success)" }}>{formatCurrency(totalCostPerMile)}/mi</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{totalMiles.toFixed(0)} mi · {formatCurrency(totalActual)} actual</div>
            </div>
            <MiniLineChart
              labels={efficiencyTrend.map((w) => w.label)}
              datasets={[
                { data: efficiencyTrend.map((w) => w.cpm), color: "var(--success)" },
              ]}
            />
          </div>
        )}

        {activeChart === 3 && (
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 2, fontWeight: 700, marginBottom: 16, textAlign: "center", textTransform: "uppercase" }}>
              Trip Type Breakdown
            </div>
            {tripTypeData.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No trips in this range</div>
            ) : (
              <MiniPieChart data={tripTypeData} />
            )}
          </div>
        )}

        {activeChart === 4 && (
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 2, fontWeight: 700, marginBottom: 16, textAlign: "center", textTransform: "uppercase" }}>
              Speed Tracking — {speedDriver === "all" ? "All Drivers" : (drivers.find(d => d.id === speedDriver)?.name || "Unknown")}
            </div>

            {/* Driver Selector */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, justifyContent: "center" }}>
              <button
                onClick={() => setSpeedDriver("all")}
                style={{
                  padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: speedDriver === "all" ? "rgba(232,180,74,0.15)" : "var(--bg)",
                  border: `1px solid ${speedDriver === "all" ? "rgba(232,180,74,0.3)" : "var(--border)"}`,
                  color: speedDriver === "all" ? "var(--accent)" : "var(--muted)",
                  borderRadius: "var(--radius-sm)", letterSpacing: 0.5,
                }}
              >All</button>
              {drivers.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSpeedDriver(d.id)}
                  style={{
                    padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: speedDriver === d.id ? "rgba(232,180,74,0.15)" : "var(--bg)",
                    border: `1px solid ${speedDriver === d.id ? "rgba(232,180,74,0.3)" : "var(--border)"}`,
                    color: speedDriver === d.id ? "var(--accent)" : "var(--muted)",
                    borderRadius: "var(--radius-sm)", letterSpacing: 0.5,
                  }}
                >{d.name.split(" ")[0]}</button>
              ))}
            </div>

            {speedData.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No speed data available yet</div>
            ) : (
              <>
                <MiniLineChart
                  labels={speedData.map(t => new Date(t.actual_start).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }))}
                  datasets={[
                    { data: speedData.map(t => t.obd_data?.max_speed || 0), color: "var(--danger)" },
                    { data: speedData.map(t => t.obd_data?.avg_speed || 0), color: "var(--accent)" },
                  ]}
                />
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 3, borderRadius: 2, background: "var(--danger)" }} />
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Top Speed</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 3, borderRadius: 2, background: "var(--accent)" }} />
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Avg Speed</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>80 mph limit ┈</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Per-entry table */}
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
                  const v = Number(e.actual_cost ?? 0) - Number(e.estimated_cost ?? 0);
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>
                        {driver?.name ?? "—"}
                        {driver?.willing_to_fly && <span style={{ color: "var(--accent)", marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(F)</span>}
                      </td>
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
  const [activeStops, setActiveStops] = useState([]);
  const [obdInstability, setObdInstability] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showTripLogs, setShowTripLogs] = useState(false);

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
    // Dealership geofence boundary (Discovery Automotive - Shelby, NC)
    window.L.circle([35.270366805900295, -81.49624707303701], {
      radius: 250,
      color: "#f5a623",
      fillColor: "#f5a623",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "6, 4",
    }).addTo(map).bindPopup(
      `<div style="font-family: 'Barlow Condensed', sans-serif; background: #161a20; color: #e8ecf0;">
        <div style="font-size: 14px; font-weight: 800; letter-spacing: 1px;">DEALERSHIP</div>
        <div style="font-size: 11px; color: #6b7585;">250m geofence radius</div>
      </div>`
    );

    mapInstanceRef.current = map;
    fetchLocations(map);
  }

  async function fetchLocations(map) {
    setLoading(true);
    const [{ data: locs }, { data: stops }, { data: activeTrips }] = await Promise.all([
      supabase.from("driver_locations").select("*"),
      supabase.from("trip_stops").select("*").is("ended_at", null),
      supabase.from("trips").select("driver_id, designated_driver_id").eq("status", "in_progress"),
    ]);
    // Only show the designated driver of each active trip — second drivers are
    // passengers, not tracked. second_driver_id was leaking through here when
    // the driver had a stale driver_locations row from a previous trip.
    const activeDriverIds = new Set(
      (activeTrips ?? []).map(t => t.designated_driver_id || t.driver_id).filter(Boolean)
    );
    const filteredLocs = (locs ?? []).filter(l => activeDriverIds.has(l.driver_id));

    // Count OBD failures per driver in the last 10 min — flag drivers
    // with 5+ disconnects or any rescanning event as "unstable"
    const { data: obdLogs } = await supabase
      .from("system_logs")
      .select("event, metadata, created_at")
      .in("event", ["obd_disconnected", "obd_rescanning", "obd_no_ecu_response", "obd_connect_failed"])
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
    const obdFailuresByDriver = {};
    (obdLogs || []).forEach(log => {
      const driverId = log.metadata?.driver_id;
      if (driverId) {
        obdFailuresByDriver[driverId] = (obdFailuresByDriver[driverId] || 0) + 1;
      }
    });
    setObdInstability(obdFailuresByDriver);

    setLocations(filteredLocs);
    setActiveStops(stops ?? []);
    setLastRefresh(new Date());
    updateMarkers(filteredLocs, stops ?? [], map);
    setLoading(false);
  }

  function updateMarkers(locs, stops, map) {
    if (!map || !window.L) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (locs.length === 0) return;

    const bounds = [];
    locs.forEach((loc) => {
      const driver = drivers.find((d) => d.id === loc.driver_id);
      const name = driver?.name ?? "Unknown Driver";
      const firstName = name.split(" ")[0];
      const age = Math.floor((new Date() - new Date(loc.updated_at)) / 1000);
      const ageLabel =
        age < 60
          ? `${age}s ago`
          : age < 3600
            ? `${Math.floor(age / 60)}m ago`
            : `${Math.floor(age / 3600)}h ago`;
      const isRecent = age < 120;
      const activeStop = stops.find((s) => s.driver_id === loc.driver_id);
      const isStopped = !!activeStop;
      const color = isStopped ? "#ff453a" : isRecent ? "#4ae885" : "#f5a623";

      let stopInfo = "";
      if (isStopped) {
        const stopMins = Math.round((Date.now() - new Date(activeStop.started_at).getTime()) / 60000);
        stopInfo = `<div style="font-size: 11px; color: #ff453a; font-weight: 700; margin-top: 4px;">STOPPED ${stopMins}m</div>`;
      }

      // Use real ETA from Google Distance Matrix (cached in driver_locations)
      // Fall back to straight-line distance if no ETA cached yet
      let etaLabel;
      if (loc.eta_miles != null && loc.eta_minutes != null) {
        if (loc.eta_miles < 5) {
          etaLabel = "At the dealership";
        } else {
          const hrs = loc.eta_minutes / 60;
          etaLabel = hrs < 1
            ? `~${loc.eta_miles} mi, ~${loc.eta_minutes} min`
            : `~${loc.eta_miles} mi, ~${hrs.toFixed(1)} hrs`;
        }
      } else {
        const DEALER_LAT = 35.270367;
        const DEALER_LON = -81.496247;
        const toRad = (deg) => deg * Math.PI / 180;
        const dLat = toRad(loc.latitude - DEALER_LAT);
        const dLon = toRad(loc.longitude - DEALER_LON);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(toRad(DEALER_LAT)) * Math.cos(toRad(loc.latitude)) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const distMiles = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        etaLabel = distMiles < 5 ? "At the dealership" : `~${Math.round(distMiles)} mi out`;
      }

      const icon = window.L.divIcon({
        className: "",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="
              background: ${color};
              border: 2px solid #0d0f12;
              border-radius: 50%;
              width: 14px;
              height: 14px;
              box-shadow: 0 0 ${isStopped ? "10px #ff453a" : isRecent ? "8px #4ae885" : "6px #f5a623"};
            "></div>
            <div style="font-size: 9px; font-weight: 700; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin-top: 2px; white-space: nowrap;">${firstName}</div>
          </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 7],
      });

      const marker = window.L.marker([loc.latitude, loc.longitude], { icon })
        .bindPopup(
          `
          <div style="font-family: 'Barlow Condensed', sans-serif; min-width: 140px; background: #161a20; color: #e8ecf0; border: none;">
            <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 11px; color: #6b7585; letter-spacing: 1px;">LAST UPDATE</div>
            <div style="font-size: 13px; font-weight: 600; color: ${color};">${ageLabel}</div>
            ${stopInfo}
            ${loc.obd_speed != null ? `<div style="font-size: 11px; color: #6b7585; letter-spacing: 1px; margin-top: 6px;">VEHICLE</div><div style="font-size: 13px; font-weight: 600;">${loc.obd_speed} mph${loc.obd_rpm != null ? ` · ${loc.obd_rpm.toLocaleString()} rpm` : ""}${loc.obd_fuel != null ? ` · ⛽ ${loc.obd_fuel}%` : ""}</div>` : ""}
            <div style="font-size: 12px; color: #f5a623; font-weight: 600; margin-top: 6px;">${etaLabel}</div>
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

  const activeLocs = locations;

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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ padding: "6px 14px", fontSize: 11 }}
            onClick={() => setShowTripLogs(true)}
          >
            TRIP LOGS
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
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
                {loc.obd_speed != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: loc.obd_speed > 80 ? "var(--danger)" : "var(--text)" }}>
                    {loc.obd_speed} mph
                  </span>
                )}
                {loc.obd_fuel != null && (
                  <span style={{ fontSize: 11, color: loc.obd_fuel < 15 ? "var(--danger)" : "var(--muted)" }}>
                    ⛽ {loc.obd_fuel}%
                  </span>
                )}
                {obdInstability[loc.driver_id] >= 5 && (
                  <span
                    title={`${obdInstability[loc.driver_id]} OBD errors in last 10 min`}
                    style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)" }}
                  >
                    ⚠ OBD
                  </span>
                )}
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

      {/* Trip Logs Modal */}
      {showTripLogs && (
        <div className="modal-overlay" onClick={() => setShowTripLogs(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div className="modal-title" style={{ marginBottom: 0 }}>Live Trip Logs</div>
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 16px", fontSize: 11 }}
                onClick={() => setShowTripLogs(false)}
              >
                CLOSE
              </button>
            </div>
            <WebTripLogs drivers={drivers} />
          </div>
        </div>
      )}
    </div>
  );
}

const WEB_LOCATIONIQ_KEY = "pk.ad8425665c12e1b7f5d7827258d59077";
const webLocationCache = {};

async function webReverseGeocode(lat, lon) {
  const key = `${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
  if (webLocationCache[key]) return webLocationCache[key];
  try {
    const res = await fetch(`https://us1.locationiq.com/v1/reverse?key=${WEB_LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
    const state = data.address?.state || "";
    const result = city && state ? `${city}, ${state}` : city || state || null;
    webLocationCache[key] = result;
    return result;
  } catch { return null; }
}

function WebTripLogs({ drivers }) {
  const [mode, setMode] = useState("live");
  const [trips, setTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [pauseEvents, setPauseEvents] = useState([]);
  const [stopLocations, setStopLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyDriver, setHistoryDriver] = useState("all");

  async function loadLive() {
    const [{ data: activeTrips }, { data: allStops }, { data: pauses }] = await Promise.all([
      supabase.from("trips").select("*").in("status", ["in_progress"]),
      supabase.from("trip_stops").select("*").order("started_at", { ascending: false }).limit(50),
      supabase.from("system_logs").select("*").in("event", ["trip_paused", "trip_resumed"]).order("created_at", { ascending: false }).limit(50),
    ]);
    setTrips(activeTrips ?? []);
    setStops(allStops ?? []);
    setPauseEvents(pauses ?? []);
    setLoading(false);
    geocodeStops(allStops ?? []);
  }

  async function loadHistory() {
    setLoading(true);
    let tripQuery = supabase.from("trips").select("*")
      .in("status", ["completed", "finalized"])
      .gte("actual_start", historyDate + "T00:00:00")
      .lte("actual_start", historyDate + "T23:59:59")
      .order("actual_start", { ascending: false });

    if (historyDriver !== "all") {
      tripQuery = tripQuery.or(`driver_id.eq.${historyDriver},designated_driver_id.eq.${historyDriver}`);
    }

    const { data: histTrips } = await tripQuery;
    const tripIds = (histTrips ?? []).map((t) => t.id);

    let histStops = [];
    let histPauses = [];
    if (tripIds.length > 0) {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("trip_stops").select("*").in("trip_id", tripIds).order("started_at", { ascending: false }),
        supabase.from("system_logs").select("*").in("event", ["trip_paused", "trip_resumed"]).order("created_at", { ascending: false }).limit(100),
      ]);
      histStops = s ?? [];
      histPauses = (p ?? []).filter((pe) => tripIds.includes(pe.metadata?.trip_id));
    }

    setTrips(histTrips ?? []);
    setStops(histStops);
    setPauseEvents(histPauses);
    setLoading(false);
    geocodeStops(histStops);
  }

  function geocodeStops(stopsToGeocode) {
    const pending = stopsToGeocode.filter(
      (stop) => stop.latitude && stop.longitude && !stopLocations[stop.id] && !stop.city
    );
    // Use cached city from DB first
    stopsToGeocode.forEach((stop) => {
      if (stop.city && !stopLocations[stop.id]) {
        setStopLocations((prev) => ({ ...prev, [stop.id]: stop.city }));
      }
    });
    // Only geocode stops that have no city saved — rate limited
    pending.forEach((stop, i) => {
      setTimeout(() => {
        webReverseGeocode(stop.latitude, stop.longitude).then((loc) => {
          if (loc) {
            setStopLocations((prev) => ({ ...prev, [stop.id]: loc }));
            // Save to DB so we never look it up again
            supabase.from('trip_stops').update({ city: loc }).eq('id', stop.id);
          }
        });
      }, i * 600);
    });
  }

  useEffect(() => {
    if (mode === "live") {
      loadLive();
      const interval = setInterval(loadLive, 15000);
      return () => clearInterval(interval);
    } else {
      loadHistory();
    }
  }, [mode, historyDate, historyDriver]);

  function getName(id) {
    return drivers.find((d) => d.id === id)?.name ?? "Unknown";
  }

  return (
    <div>
      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setMode("live")}
          style={{
            flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: "pointer",
            background: mode === "live" ? "rgba(232,180,74,0.1)" : "var(--bg)",
            border: `1px solid ${mode === "live" ? "rgba(232,180,74,0.3)" : "var(--border)"}`,
            color: mode === "live" ? "var(--accent)" : "var(--muted)",
            borderRadius: "var(--radius-sm)",
          }}
        >LIVE</button>
        <button
          onClick={() => setMode("history")}
          style={{
            flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: "pointer",
            background: mode === "history" ? "rgba(232,180,74,0.1)" : "var(--bg)",
            border: `1px solid ${mode === "history" ? "rgba(232,180,74,0.3)" : "var(--border)"}`,
            color: mode === "history" ? "var(--accent)" : "var(--muted)",
            borderRadius: "var(--radius-sm)",
          }}
        >HISTORY</button>
      </div>

      {/* History Filters */}
      {mode === "history" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            style={{
              background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
              color: "var(--accent)", padding: "6px 12px", fontSize: 12, colorScheme: "dark",
            }}
          />
          <select
            value={historyDriver}
            onChange={(e) => setHistoryDriver(e.target.value)}
            style={{
              background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              color: "var(--text)", padding: "6px 12px", fontSize: 12,
            }}
          >
            <option value="all">All Drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>Loading...</div>}

      {!loading && trips.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          {mode === "live" ? "No active trips" : "No trips found for this date"}
        </div>
      )}

      {!loading && (
        <div style={{ display: "grid", gap: 12 }}>
          {trips.map((trip) => {
            const driverName = getName(trip.designated_driver_id || trip.driver_id);
            const tripStops = stops.filter((s) => s.trip_id === trip.id);
            const tripPauses = pauseEvents.filter((p) => p.metadata?.trip_id === trip.id);
            const activeStop = mode === "live" ? tripStops.find((s) => !s.ended_at) : null;
            const elapsed = trip.actual_start
              ? Math.round(((trip.actual_end ? new Date(trip.actual_end) : Date.now()) - new Date(trip.actual_start).getTime()) / 60000)
              : 0;

        return (
          <div key={trip.id} style={{
            background: "var(--bg)",
            border: `1px solid ${activeStop ? "rgba(255,69,58,0.3)" : "var(--border)"}`,
            borderLeft: `3px solid ${activeStop ? "#ff453a" : "var(--accent)"}`,
            borderRadius: "var(--radius-sm)",
            padding: "16px 20px",
          }}>
            {(() => {
              const driverLoc = mode === "live" && typeof locations !== "undefined" ? locations.find(l => l.driver_id === (trip.designated_driver_id || trip.driver_id)) : null;
              return driverLoc?.obd_speed != null ? (
                <div style={{ display: "flex", gap: 12, marginBottom: 8, padding: "6px 10px", background: "rgba(74,144,226,0.06)", border: "1px solid rgba(74,144,226,0.2)", borderRadius: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: driverLoc.obd_speed > 80 ? "var(--danger)" : "var(--text)" }}>{driverLoc.obd_speed} mph</span>
                  {driverLoc.obd_rpm != null && <span style={{ color: "var(--muted)" }}>{driverLoc.obd_rpm.toLocaleString()} rpm</span>}
                  {driverLoc.obd_fuel != null && <span style={{ color: driverLoc.obd_fuel < 15 ? "var(--danger)" : "var(--muted)" }}>⛽ {driverLoc.obd_fuel}%</span>}
                </div>
              ) : null;
            })()}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{driverName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{trip.trip_type === "airport" ? `Airport Drop-off · ${trip.city}` : trip.city} · {trip.crm_id || "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{elapsed}m</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5 }}>ELAPSED</div>
              </div>
            </div>

            {activeStop && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.25)",
                borderRadius: 4, padding: "6px 12px", marginBottom: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: "#ff453a" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#ff453a", letterSpacing: 1.5 }}>
                  STOPPED {Math.round((Date.now() - new Date(activeStop.started_at).getTime()) / 60000)}m
                </span>
              </div>
            )}

            {tripStops.length > 0 ? (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: 2, marginBottom: 4 }}>
                  STOPS ({tripStops.length})
                </div>
                {tripStops.map((stop) => (
                  <div key={stop.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                    <div>
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(stop.started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET
                      </span>
                      {stopLocations[stop.id] && (
                        <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{stopLocations[stop.id]}</div>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: stop.ended_at ? "var(--text)" : "#ff453a" }}>
                      {stop.ended_at
                        ? `${stop.duration_minutes}m`
                        : `${Math.round((Date.now() - new Date(stop.started_at).getTime()) / 60000)}m (active)`
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              !tripPauses.length ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>No stops or pauses recorded</div> : null
            )}

            {tripPauses.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: 2, marginBottom: 4 }}>
                  PAUSES ({tripPauses.length})
                </div>
                {tripPauses.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                    <span style={{ color: "var(--muted)" }}>
                      {p.event === "trip_paused" ? "⏸" : "▶"}{" "}
                      {new Date(p.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET
                    </span>
                    <span style={{ fontWeight: 700, color: p.event === "trip_paused" ? "var(--accent)" : "var(--success)" }}>
                      {p.event === "trip_paused" ? "PAUSED" : "RESUMED"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DRIVER DETAIL VIEW (with edit) ───────────────────────────────────────────
function DriverDetailView({ driver, onBack, onDelete, deleting, onProfileUpdated, canSeePay = false, canManageUsers = false }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const [editForm, setEditForm] = useState({
    name: driver.name || "",
    email: driver.email || "",
    role: driver.role || "driver",
    phone_number: driver.phone_number || "",
    date_of_birth: driver.date_of_birth || "",
    willing_to_fly: driver.willing_to_fly || false,
    can_drive_manual: driver.can_drive_manual || false,
    drivers_license_number: driver.drivers_license_number || "",
    hourly_wage: driver.hourly_wage ?? "",
  });

  function startEdit() {
    setEditForm({
      name: driver.name || "",
      email: driver.email || "",
      role: driver.role || "driver",
      phone_number: driver.phone_number || "",
      date_of_birth: driver.date_of_birth || "",
      willing_to_fly: driver.willing_to_fly || false,
      can_drive_manual: driver.can_drive_manual || false,
      drivers_license_number: driver.drivers_license_number || "",
      hourly_wage: driver.hourly_wage ?? "",
    });
    setLicenseFile(null);
    setEditError("");
    setEditSuccess("");
    setEditing(true);
  }

  async function handleSave() {
    if (!editForm.name.trim()) {
      setEditError("Name is required.");
      return;
    }
    setSaving(true);
    setEditError("");

    let licensePhotoUrl = driver.drivers_license_photo_url || null;

    // Upload new license photo if provided
    if (licenseFile) {
      setUploadProgress(10);
      const fileExt = licenseFile.name.split('.').pop();
      const fileName = `${driver.id}/license.${fileExt}`;
      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('driver-licenses')
        .upload(fileName, licenseFile, { cacheControl: '3600', upsert: true });
      if (uploadError) {
        setEditError(`License upload failed: ${uploadError.message}`);
        setSaving(false);
        setUploadProgress(0);
        return;
      }
      setUploadProgress(70);
      const { data: { publicUrl } } = supabase.storage
        .from('driver-licenses')
        .getPublicUrl(fileName);
      licensePhotoUrl = publicUrl;
      setUploadProgress(100);
    }

    // Update email via edge function if it changed
    if (editForm.email && editForm.email !== driver.email) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setEditError("Session expired. Please log in again.");
        setSaving(false);
        return;
      }
      const emailRes = await fetch(
        `https://yincjogkjvotupzgetqg.supabase.co/functions/v1/manage-users`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "update-email", userId: driver.id, email: editForm.email }),
        }
      );
      if (!emailRes.ok) {
        const errData = await emailRes.json();
        setEditError(errData.error || "Failed to update email");
        setSaving(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        name: editForm.name.trim(),
        email: editForm.email || null,
        role: editForm.role,
        phone_number: editForm.phone_number || null,
        date_of_birth: editForm.date_of_birth || null,
        willing_to_fly: editForm.willing_to_fly,
        can_drive_manual: editForm.can_drive_manual,
        drivers_license_number: editForm.drivers_license_number || null,
        drivers_license_photo_url: licensePhotoUrl,
        ...(canSeePay && { hourly_wage: editForm.hourly_wage ? Number(editForm.hourly_wage) : null }),
      })
      .eq("id", driver.id);

    if (updateError) {
      setEditError(updateError.message);
      setSaving(false);
      return;
    }

    const updated = {
      ...driver,
      name: editForm.name.trim(),
      email: editForm.email || null,
      role: editForm.role,
      phone_number: editForm.phone_number || null,
      date_of_birth: editForm.date_of_birth || null,
      willing_to_fly: editForm.willing_to_fly,
      can_drive_manual: editForm.can_drive_manual,
      drivers_license_number: editForm.drivers_license_number || null,
      drivers_license_photo_url: licensePhotoUrl,
    };

    onProfileUpdated(updated);
    setSaving(false);
    setEditing(false);
    setEditSuccess("Profile updated successfully.");
    setTimeout(() => setEditSuccess(""), 3000);
  }

  if (editing) {
    return (
      <div>
        <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setEditing(false)} className="btn-secondary">← Cancel</button>
          <h2 style={{ margin: 0 }}>Edit — {driver.name}</h2>
        </div>

        {editError && <div className="error-banner">{editError}</div>}

        <div className="form-grid">
          <div className="form-group">
            <label>Name <span style={{ color: "var(--danger)" }}>*</span></label>
            <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="user@example.com" />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="driver">Driver</option>
              <option value="manager">Manager</option>
              <option value="caller">Caller</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} placeholder="(555) 123-4567" />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Driver's License Number</label>
            <input type="text" value={editForm.drivers_license_number} onChange={(e) => setEditForm({ ...editForm, drivers_license_number: e.target.value })} placeholder="DL123456" />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={editForm.willing_to_fly} onChange={(e) => setEditForm({ ...editForm, willing_to_fly: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
              Willing to fly
            </label>
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={editForm.can_drive_manual} onChange={(e) => setEditForm({ ...editForm, can_drive_manual: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
              Can drive manual transmission
            </label>
          </div>
          {canSeePay && (
            <div className="form-group">
              <label>Hourly Wage ($)</label>
              <input type="number" value={editForm.hourly_wage} onChange={(e) => setEditForm({ ...editForm, hourly_wage: e.target.value })} placeholder="0.00" step="0.25" />
            </div>
          )}
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Update License Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setLicenseFile(e.target.files[0])} />
            {licenseFile && <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>Selected: {licenseFile.name}</div>}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Uploading photo...</span>
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{uploadProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill trips" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            {uploadProgress === 100 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--success)", fontWeight: 600 }}>✓ Photo uploaded</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (uploadProgress > 0 && uploadProgress < 100 ? "Uploading..." : "Saving...") : "Save Changes →"}
          </button>
          <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <h2 style={{ margin: 0 }}>{driver.name}</h2>
        {canManageUsers && <button onClick={startEdit} className="btn-edit" style={{ marginLeft: "auto" }}>Edit Profile</button>}
      </div>

      {editSuccess && <div className="success-banner">{editSuccess}</div>}

      <div className="driver-detail-grid">
        <div className="detail-section">
          <h3>Basic Information</h3>
          <div className="detail-row">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{driver.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{driver.email || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role:</span>
            <span className="detail-value" style={{
              textTransform: "capitalize",
              color: driver.role === "admin" ? "var(--accent)" : "inherit",
            }}>
              {driver.role}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone:</span>
            <span className="detail-value">{driver.phone_number || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date of Birth:</span>
            <span className="detail-value">
              {driver.date_of_birth
                ? new Date(driver.date_of_birth).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Willing to Fly:</span>
            <span className="detail-value">
              {driver.willing_to_fly ? "✓ Yes" : "✗ No"}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <h3>License &amp; Driving</h3>
          <div className="detail-row">
            <span className="detail-label">Can Drive Manual:</span>
            <span className="detail-value" style={{
              color: driver.can_drive_manual ? "var(--success)" : "var(--muted)",
            }}>
              {driver.can_drive_manual ? "✓ Yes (Stick Shift)" : "✗ Automatic Only"}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">License Number:</span>
            <span className="detail-value">{driver.drivers_license_number || "—"}</span>
          </div>
          {canSeePay && (
            <div className="detail-row">
              <span className="detail-label">Hourly Wage:</span>
              <span className="detail-value" style={{ color: driver.hourly_wage ? "var(--accent)" : "var(--muted)" }}>
                {driver.hourly_wage ? `$${Number(driver.hourly_wage).toFixed(2)}/hr` : "Not set"}
              </span>
            </div>
          )}
          {driver.drivers_license_photo_url && (
            <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <span className="detail-label">License Photo:</span>
              <img
                src={driver.drivers_license_photo_url}
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

      {canSeePay && (
        <button
          onClick={onDelete}
          disabled={deleting}
          className="btn-danger"
          style={{ marginTop: 24 }}
        >
          {deleting ? "Deleting..." : "Delete User"}
        </button>
      )}
    </div>
  );
}

function ManageUsers({ allProfiles, setAllProfiles, canSeePay, canManageUsers }) {
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
    hourly_wage: "",
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
    const profileUpdate = {
      phone_number: form.phone_number || null,
      date_of_birth: form.date_of_birth || null,
      can_drive_manual: form.can_drive_manual,
      drivers_license_number: form.drivers_license_number || null,
      drivers_license_photo_url: licensePhotoUrl,
    };
    if (canSeePay) {
      profileUpdate.hourly_wage = form.hourly_wage ? Number(form.hourly_wage) : null;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdate)
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
    setSelectedDriver(null);
    setView("list");
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
            <label>Name <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full Name"
            />
          </div>
          <div className="form-group">
            <label>Email <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
            />
          </div>
          <div className="form-group">
            <label>Role <span style={{ color: "var(--danger)" }}>*</span></label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="driver">Driver</option>
              <option value="manager">Manager</option>
              <option value="caller">Caller (Read-Only)</option>
              {canSeePay && <option value="admin">Admin</option>}
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
          {canSeePay && (
            <div className="form-group">
              <label>Hourly Wage ($)</label>
              <input
                type="number"
                value={form.hourly_wage}
                onChange={(e) => setForm({ ...form, hourly_wage: e.target.value })}
                placeholder="0.00"
                step="0.25"
              />
            </div>
          )}
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
      <DriverDetailView
        driver={selectedDriver}
        supabase={supabase}
        onBack={() => { setView("list"); setSelectedDriver(null); }}
        onDelete={() => handleDelete(selectedDriver)}
        deleting={deleting === selectedDriver.id}
        onProfileUpdated={(updated) => {
          setSelectedDriver(updated);
          setAllProfiles((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        }}
        canSeePay={canSeePay}
        canManageUsers={canManageUsers}
      />
    );
  }

  // Default list view
  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Manage Users</h2>
        {canManageUsers && (
          <button onClick={() => setView("add")} className="btn btn-primary">
            + Create User
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Notifications</th>
              <th>Manual Trans</th>
              <th>Willing to Fly</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...allProfiles].sort((a, b) => {
              const roleOrder = { admin: 0, manager: 1, caller: 2, driver: 3 };
              const roleA = roleOrder[a.role] ?? 3;
              const roleB = roleOrder[b.role] ?? 3;
              if (roleA !== roleB) return roleA - roleB;
              return (a.name || "").localeCompare(b.name || "");
            }).map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 600 }}>{user.name}</td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>{user.email || "—"}</td>
                <td style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
                  {(user.role === "admin" || user.role === "manager") && <span style={{ color: user.role === "admin" ? "var(--accent)" : "var(--accent2)" }}>{user.role === "admin" ? "★" : "◆"} </span>}
                  {user.role}
                </td>
                <td style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                  {user.phone_number || "—"}
                </td>
                <td style={{ textAlign: "center" }}>
                  {(user.role === "driver" || user.role === "manager") ? (
                    user.push_token
                      ? <span style={{ color: "var(--success)" }}>✓</span>
                      : <span style={{ color: "var(--danger)", fontWeight: 700, fontSize: 11 }}>OFF</span>
                  ) : <span style={{ color: "var(--muted)" }}>—</span>}
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

// ─── CHASE VEHICLES (FLEET) ───────────────────────────────────────────────────
function ChaseVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [mileageLogs, setMileageLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | add
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState({ stock_number: "", vin: "", year: "", make: "", model: "", current_mileage: "", notes: "", oil_change_due_mileage: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedVehicle, setExpandedVehicle] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("chase_vehicles").select("*").order("stock_number");
    setVehicles(data || []);
    setLoading(false);
  }

  async function loadMileageLog(vehicleId) {
    if (mileageLogs[vehicleId]) return;
    const { data } = await supabase
      .from("chase_vehicle_mileage_log")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(20);
    setMileageLogs((prev) => ({ ...prev, [vehicleId]: data || [] }));
  }

  function resetForm() {
    setForm({ stock_number: "", vin: "", year: "", make: "", model: "", current_mileage: "", notes: "", oil_change_due_mileage: "" });
    setError("");
  }

  async function handleSave() {
    if (!form.stock_number) { setError("Stock number is required"); return; }
    setSaving(true);
    setError("");

    if (editingVehicle) {
      const { error: err } = await supabase
        .from("chase_vehicles")
        .update({
          stock_number: form.stock_number,
          vin: form.vin || null,
          year: form.year ? Number(form.year) : null,
          make: form.make || null,
          model: form.model || null,
          current_mileage: form.current_mileage ? Number(form.current_mileage) : 0,
          notes: form.notes || null,
          oil_change_due_mileage: form.oil_change_due_mileage ? Number(form.oil_change_due_mileage) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingVehicle.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from("chase_vehicles")
        .insert({
          stock_number: form.stock_number,
          vin: form.vin || null,
          year: form.year ? Number(form.year) : null,
          make: form.make || null,
          model: form.model || null,
          current_mileage: form.current_mileage ? Number(form.current_mileage) : 0,
          notes: form.notes || null,
          oil_change_due_mileage: form.oil_change_due_mileage ? Number(form.oil_change_due_mileage) : null,
        });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setEditingVehicle(null);
    setView("list");
    resetForm();
    load();
  }

  async function handleDelete(vehicle) {
    if (!confirm(`Delete ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.stock_number})?`)) return;
    await supabase.from("chase_vehicles").delete().eq("id", vehicle.id);
    load();
  }

  async function handleStatusChange(vehicle, newStatus) {
    await supabase.from("chase_vehicles").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", vehicle.id);
    load();
  }

  if (loading) return <div style={{ padding: 40, color: "var(--muted)" }}>Loading fleet...</div>;

  if (view === "add" || editingVehicle) {
    return (
      <div className="form-card fade-in">
        <div className="form-card-title">{editingVehicle ? "Edit Vehicle" : "Add Chase Vehicle"}</div>
        <div className="form-grid">
          <div className="field">
            <label>Stock Number *</label>
            <input value={form.stock_number} onChange={(e) => setForm({ ...form, stock_number: e.target.value })} placeholder="STK-001" />
          </div>
          <div className="field">
            <label>VIN</label>
            <input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="1HGCM82633A004352" />
          </div>
          <div className="field">
            <label>Year</label>
            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" />
          </div>
          <div className="field">
            <label>Make</label>
            <input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Toyota" />
          </div>
          <div className="field">
            <label>Model</label>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Camry" />
          </div>
          <div className="field">
            <label>Current Mileage</label>
            <input type="number" value={form.current_mileage} onChange={(e) => setForm({ ...form, current_mileage: e.target.value })} placeholder="45000" />
          </div>
          <div className="field">
            <label>Oil Change Due (miles)</label>
            <input type="number" value={form.oil_change_due_mileage} onChange={(e) => setForm({ ...form, oil_change_due_mileage: e.target.value })} placeholder="9941" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
          </div>
        </div>
        {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingVehicle ? "Save Changes →" : "Add Vehicle →"}
          </button>
          <button className="btn btn-ghost" onClick={() => { setView("list"); setEditingVehicle(null); resetForm(); }}>Cancel</button>
        </div>
      </div>
    );
  }

  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const inactiveVehicles = vehicles.filter((v) => v.status !== "active");

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>FLEET</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{activeVehicles.length} active vehicle{activeVehicles.length !== 1 ? "s" : ""}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setView("add"); }}>+ Add Vehicle</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Stock #</th>
              <th>Vehicle</th>
              <th>VIN</th>
              <th>Mileage</th>
              <th>Oil Change Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <Fragment key={v.id}>
                <tr style={{ opacity: v.status !== "active" ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{v.stock_number}</td>
                  <td>{v.year} {v.make} {v.model}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>{v.vin || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{Number(v.current_mileage || 0).toLocaleString()} mi</td>
                  <td style={{ fontSize: 12, color: v.oil_change_due_mileage && Number(v.current_mileage || 0) >= Number(v.oil_change_due_mileage) ? "var(--danger)" : "var(--muted)" }}>{v.oil_change_due_mileage ? `${Number(v.oil_change_due_mileage).toLocaleString()} mi` : "—"}</td>
                  <td>
                    <select
                      value={v.status}
                      onChange={(e) => handleStatusChange(v, e.target.value)}
                      style={{ fontSize: 11, padding: "3px 6px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 4 }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="sold">Sold</option>
                    </select>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setExpandedVehicle(expandedVehicle === v.id ? null : v.id);
                        loadMileageLog(v.id);
                      }}
                    >
                      {expandedVehicle === v.id ? "Hide Log" : "Mileage Log"}
                    </button>
                    <button
                      className="btn-edit"
                      style={{ background: "rgba(245,166,35,0.1)", color: "var(--accent)", borderColor: "var(--accent)" }}
                      onClick={() => {
                        setEditingVehicle(v);
                        setForm({
                          stock_number: v.stock_number || "",
                          vin: v.vin || "",
                          year: v.year ? String(v.year) : "",
                          make: v.make || "",
                          model: v.model || "",
                          current_mileage: v.current_mileage ? String(v.current_mileage) : "",
                          notes: v.notes || "",
                          oil_change_due_mileage: v.oil_change_due_mileage ? String(v.oil_change_due_mileage) : "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-edit"
                      style={{ background: "rgba(232,90,74,0.1)", color: "var(--danger)", borderColor: "var(--danger)" }}
                      onClick={() => handleDelete(v)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {expandedVehicle === v.id && (
                  <tr>
                    <td colSpan="7" style={{ padding: "12px 20px", background: "var(--bg)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 8 }}>MILEAGE LOG</div>
                      {(mileageLogs[v.id] || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>No trips recorded for this vehicle yet.</div>
                      ) : (
                        <table style={{ width: "100%", fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", fontSize: 10 }}>Date</th>
                              <th style={{ textAlign: "left", fontSize: 10 }}>City</th>
                              <th style={{ textAlign: "left", fontSize: 10 }}>Driver</th>
                              <th style={{ textAlign: "right", fontSize: 10 }}>Miles Added</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(mileageLogs[v.id] || []).map((log) => (
                              <tr key={log.id}>
                                <td style={{ color: "var(--muted)" }}>{log.trip_date || "—"}</td>
                                <td>{log.trip_city || "—"}</td>
                                <td>{log.driver_name || "—"}</td>
                                <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent)" }}>+{Number(log.miles_added).toFixed(1)} mi</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {vehicles.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          No chase vehicles added yet. Click "Add Vehicle" to get started.
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({
  user,
  allProfiles,
  setAllProfiles,
  entries,
  setEntries,
  trips,
  setTrips,
  prefillData,
  onPrefillConsumed,
  onTabChange,
}) {
  const isAdmin = user.role === "admin" || user.role === "manager";
  const canSeePay = user.role === "admin";
  const canManageUsers = user.role === "admin" || user.role === "manager";
  const [chaseVehiclesList, setChaseVehiclesList] = useState([]);

  useEffect(() => {
    supabase.from("chase_vehicles").select("*").eq("status", "active").order("stock_number").then(({ data }) => {
      setChaseVehiclesList(data || []);
    });
  }, []);
  const drivers = allProfiles.filter((u) => u.role === "driver" || u.role === "manager");

  // URL ↔ tab sync
  const TAB_PATHS = {
    "overview": "/", "trips": "/trips", "log entry": "/logentry",
    "all entries": "/allentries", "mileage costs": "/mileagecosts",
    "availability": "/availability", "capacity": "/capacity",
    "live drivers": "/livedrivers", "manage users": "/manageusers",
    "pickup calculator": "/pickupcalculator", "downloads": "/downloads",
    "my trips": "/mytrips", "weekly report": "/weeklyreport",
    "monthly report": "/monthlyreport", "fleet": "/fleet",
  };
  const PATH_TO_TAB = Object.fromEntries(
    Object.entries(TAB_PATHS).map(([k, v]) => [v, k])
  );

  function getInitialTab() {
    if (prefillData) return "trips";
    const path = window.location.pathname.toLowerCase();
    return PATH_TO_TAB[path] || "overview";
  }

  const [tab, setTabRaw] = useState(getInitialTab);
  function setTab(t) {
    setTabRaw(t);
    const path = TAB_PATHS[t] || "/";
    window.history.pushState(null, "", path);
    if (onTabChange) onTabChange();
  }

  useEffect(() => {
    function onPopState() {
      const path = window.location.pathname.toLowerCase();
      setTabRaw(PATH_TO_TAB[path] || "overview");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverTab, setDriverTab] = useState("overview");
  const [editingEntry, setEditingEntry] = useState(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterDriver, setFilterDriver] = useState("all");
  const [filterCity, setFilterCity] = useState("");
  const [filterCrmId, setFilterCrmId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, turned_down, recon_pending
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
    estimated_cost: "",
    flight_cost: "",
    rideshare_cost: "",
    fuel_cost: "",
    other_cost: "",
    city: "",
    crm_id: "",
    carpage_link: "",
    trip_type: "",
    stock_numbers: "",
    dealer_plate: "",
    chase_vehicle_stock: "",
    recon_missed: false,
  });

  useEffect(() => {
    if (drivers.length > 0 && !form.driver_id) {
      setForm((f) => ({ ...f, driver_id: drivers[0].id }));
    }
  }, [drivers.length]);

  // Compute actual cost from itemized fields + driver pay for log entry
  const logActualCost = [
    form.flight_cost, form.rideshare_cost, form.fuel_cost, form.other_cost, form.pay,
  ].reduce((sum, v) => sum + (Number(v) || 0), 0);

  async function handleSubmit() {
    if (!form.driver_id || !form.date || (canSeePay && !form.pay)) return;
    setSubmitting(true);
    const costFields = {
      flight_cost: form.flight_cost ? Number(form.flight_cost) : null,
      rideshare_cost: form.rideshare_cost ? Number(form.rideshare_cost) : null,
      fuel_cost: form.fuel_cost ? Number(form.fuel_cost) : null,
      other_cost: form.other_cost ? Number(form.other_cost) : null,
    };
    const { data, error } = await supabase
      .from("entries")
      .insert({
        driver_id: form.driver_id,
        date: form.date,
        pay: Number(form.pay),
        hours: Number(form.hours),
        miles: form.miles ? Number(form.miles) : 0,
        actual_cost: logActualCost,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
        city: form.city,
        crm_id: form.crm_id,
        carpage_link: form.carpage_link || null,
        trip_type: form.trip_type || null,
        stock_numbers: form.stock_numbers || null,
        recon_missed: form.recon_missed,
        ...costFields,
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
        estimated_cost: "",
        flight_cost: "",
        rideshare_cost: "",
        fuel_cost: "",
        other_cost: "",
        city: "",
        crm_id: "",
        carpage_link: "",
        trip_type: "",
        stock_numbers: "",
        dealer_plate: "",
        chase_vehicle_stock: "",
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
    if (filterCrmId && !(e.crm_id || "").toLowerCase().includes(filterCrmId.toLowerCase()))
      return false;
    if (filterStatus === "turned_down" && !e.turned_down) return false;
    if (filterStatus === "recon_pending" && !(e.has_additional_recon && !e.additional_recon_cost)) return false;
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

      <div className="page-title fade-in">{isAdmin ? "Admin Dashboard" : "Dashboard"}</div>
      <div className="page-sub fade-in">
        {isAdmin ? "Manage driver entries and view all accounts" : "View driver entries and trip data"}
      </div>
      <PayPeriodBanner />

      <div className="tabs">
        {[
          { key: "overview", icon: "📊", label: "Overview" },
          { key: "trips", icon: "🚗", label: "Trips" },
          isAdmin && { key: "log entry", icon: "📝", label: "Log Entry" },
          { key: "all entries", icon: "📋", label: "All Entries" },
          { key: "mileage costs", icon: "⛽", label: "Mileage Costs" },
          { key: "availability", icon: "📅", label: "Availability" },
          { key: "capacity", icon: "📋", label: "Capacity" },
          { key: "live drivers", icon: "📍", label: "Live Drivers" },
          canManageUsers && { key: "manage users", icon: "👥", label: "Manage Users" },
          isAdmin && { key: "fleet", icon: "🚙", label: "Fleet" },
          { key: "pickup calculator", icon: "🧮", label: "Pickup Calc" },
          { key: "downloads", icon: "⬇", label: "Downloads" },
        ].filter(Boolean).map((t) => (
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
                  {!d.push_token && (
                    <div style={{ color: "var(--danger)", fontSize: 10, fontWeight: 700, marginTop: 2 }}>NOTIFICATIONS OFF</div>
                  )}
                  <div className="driver-meta">
                    {weekEntries.length} trips this week · {monthTrips} this
                    month
                  </div>
                  {canSeePay && <div className="driver-pay">{formatCurrency(weekPay)}</div>}
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
                  <label>Driver <span style={{ color: "var(--danger)" }}>*</span></label>
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
                  <label>Date <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                {canSeePay && (
                  <div className="field">
                    <label>Pay Amount ($) <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.pay}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pay: e.target.value }))
                      }
                    />
                  </div>
                )}
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
                  <label>Trip Type</label>
                  <select
                    value={form.trip_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trip_type: e.target.value }))
                    }
                  >
                    <option value="">— None —</option>
                    <option value="fly">✈ Fly</option>
                    <option value="drive">🚗 Drive</option>
                    <option value="aa">🚐 AA</option>
                    <option value="courier">📦 Courier</option>
                    <option value="airport">🛫 Airport</option>
                  </select>
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
                <div className="field">
                  <label>Dealer Plate #</label>
                  <input
                    type="text"
                    placeholder="D-1234"
                    value={form.dealer_plate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dealer_plate: e.target.value }))
                    }
                  />
                </div>
                {form.trip_type === "drive" && (
                  <div className="field">
                    <label>Chase Vehicle</label>
                    <select
                      value={form.chase_vehicle_stock}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, chase_vehicle_stock: e.target.value }))
                      }
                    >
                      <option value="">— Select Chase Vehicle —</option>
                      {chaseVehiclesList.map((v) => (
                        <option key={v.id} value={v.stock_number}>
                          {v.stock_number} — {v.year} {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                {form.trip_type === "aa" && (
                  <div className="field">
                    <label>Stock Numbers</label>
                    <input
                      type="text"
                      placeholder="A123, B456, C789"
                      value={form.stock_numbers}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stock_numbers: e.target.value }))
                      }
                    />
                  </div>
                )}
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

              {/* ── Itemized Cost Breakdown ── */}
              <div style={{
                marginTop: 12,
                padding: "12px 14px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 10 }}>
                  COST BREAKDOWN
                </div>
                <div className="form-grid">
                  {(form.trip_type === "fly" || form.trip_type === "airport") && (
                    <>
                      <div className="field">
                        <label>Flight Ticket ($)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={form.flight_cost}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, flight_cost: e.target.value }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Rideshare ($)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={form.rideshare_cost}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, rideshare_cost: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  <div className="field">
                    <label>Fuel ($)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.fuel_cost}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fuel_cost: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Other Expenses ($)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.other_cost}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, other_cost: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  <span style={{ color: "var(--muted)" }}>Total Actual Cost</span>
                  <span style={{ color: "var(--text)" }}>${logActualCost.toFixed(2)}</span>
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
                  Driver Missed Recon (resets bonus streak)
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
                  {[...drivers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((d) => (
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
                <label>CRM ID</label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={filterCrmId}
                  onChange={(e) => setFilterCrmId(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="turned_down">Turned Down</option>
                  <option value="recon_pending">Recon Pending</option>
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
                  setFilterCrmId("");
                  setFilterStatus("all");
                  setFilterFrom("");
                  setFilterTo("");
                }}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "10px 16px", fontSize: 12 }}
                onClick={() => exportCSV(filteredEntries, allProfiles, canSeePay)}
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
                  {canSeePay && <th>Pay</th>}
                  <th>Hours</th>
                  <th>Miles</th>
                  <th>Recon</th>
                  {isAdmin && <th></th>}
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
                        {canSeePay && (
                          <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                            {formatCurrency(e.pay)}
                          </td>
                        )}
                        <td>{e.hours}h</td>
                        <td style={{ color: "var(--muted)" }}>
                          {e.miles ?? 0} mi
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span
                            className={`badge ${e.recon_missed ? "badge-miss" : "badge-ok"}`}
                          >
                            {e.recon_missed ? "MISSED" : "OK"}
                          </span>
                          {e.turned_down && (
                            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#0a0c10", background: "var(--accent)", padding: "2px 6px", borderRadius: 3, letterSpacing: 0.5 }}>
                              TURNED DOWN
                            </span>
                          )}
                          {e.has_additional_recon && !e.additional_recon_cost && (
                            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#0a0c10", background: "#e8b44a", padding: "2px 6px", borderRadius: 3, letterSpacing: 0.5 }}>
                              RECON PENDING
                            </span>
                          )}
                          {e.has_additional_recon && e.additional_recon_cost > 0 && (
                            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "var(--danger)", letterSpacing: 0.5 }}>
                              +{formatCurrency(e.additional_recon_cost)} recon
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => setEditingEntry(e)}
                          >
                            Edit
                          </button>
                        </td>
                        )}
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
          isAdmin={isAdmin}
          canSeePay={canSeePay}
        />
      )}

      {tab === "mileage costs" && (
        <MileageCostReport
          entries={entries}
          drivers={drivers}
          allProfiles={allProfiles}
          trips={trips}
        />
      )}

      {tab === "availability" && <AdminAvailability drivers={drivers} />}
      {tab === "capacity" && <CapacityCalendar isAdmin={isAdmin} />}
      {tab === "live drivers" && <LiveDriversMap drivers={drivers} />}
      {tab === "pickup calculator" && <PickupCalculator supabase={supabase} />}
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
            href="https://apps.apple.com/us/app/discovery-driver-portal/id6760372806"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid #3b8cf7",
              padding: "16px 24px",
              marginBottom: 12,
              textDecoration: "none",
              color: "var(--text)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us" alt="Download on the App Store" style={{ height: 40 }} />
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.cameronoberlies.driverpay"
            target="_blank"
            rel="noopener noreferrer"
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
              borderRadius: "var(--radius-sm)",
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
                Get it on Google Play
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
          canSeePay={canSeePay}
          canManageUsers={canManageUsers}
        />
      )}

      {tab === "fleet" && <ChaseVehicles />}
    </div>
  );
}

// ─── TRIP STATUS BADGE ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: "#3b8cf7",
  in_progress: "#e8b44a",
  completed: "#4ae885",
  finalized: "#6b7585",
  cancelled: "#878787",
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
        whiteSpace: "nowrap",
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
    airport_driver_id: "",
    trip_type: "fly",
    city: "",
    crm_id: "",
    carpage_link: "",
    scheduled_pickup: now.toISOString().slice(0, 16),
    notes: "",
    stock_numbers: "",
    destination_address: "",
    dealer_plate: "",
    chase_vehicle_stock: "",
    aa_stock_numbers: {},
    aa_driver_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [chaseVehicles, setChaseVehicles] = useState([]);

  useEffect(() => {
    supabase.from("chase_vehicles").select("*").eq("status", "active").order("stock_number").then(({ data }) => {
      setChaseVehicles(data || []);
    });
  }, []);
  const addressTimeoutRef = useRef(null);
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

      // Try to find CRM ID (e.g. "GN191") from page content, fall back to URL cid
      const crmId = (() => {
        const idMatch = html.match(/\bID:\s*([A-Z]{2}\d+)/);
        if (idMatch) return idMatch[1];
        return new URL(url).searchParams.get("cid") ?? "";
      })();
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

    // ── AA trip: create one trip per driver, linked by group_id ──
    if (form.trip_type === "aa") {
      const groupId = crypto.randomUUID();
      const payloads = form.aa_driver_ids.map((driverId) => ({
        driver_id: driverId,
        designated_driver_id: driverId,
        trip_type: "aa",
        city: form.city,
        crm_id: form.crm_id,
        carpage_link: form.carpage_link || null,
        scheduled_pickup: new Date(form.scheduled_pickup).toISOString(),
        notes: form.notes || null,
        status: "pending",
        group_id: groupId,
        stock_numbers: (form.aa_stock_numbers || {})[driverId] || null,
        destination_address: form.destination_address || null,
        dealer_plate: form.dealer_plate || null,
      }));

      const { data, error: err } = await supabase
        .from("trips")
        .insert(payloads)
        .select();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      data.forEach((t) => onCreated(t));

      const driverIds = form.aa_driver_ids;
      if (driverIds.length > 0) {
        fetch("https://yincjogkjvotupzgetqg.supabase.co/functions/v1/notify-trip-assigned", {
          method: "POST",
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trip_id: data[0].id,
            driver_ids: driverIds,
            city: form.city,
            scheduled_pickup: form.scheduled_pickup ? new Date(form.scheduled_pickup).toISOString() : null,
          }),
        }).catch(() => {});
      }

      setSaved(true);
      setForm((f) => ({
        ...f,
        city: "",
        crm_id: "",
        carpage_link: "",
        notes: "",
        stock_numbers: "",
        aa_stock_numbers: {},
    aa_driver_ids: [],
      }));
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    // ── Standard trip (fly, drive, courier) ──
    const payload = buildTripPayload(form);
    const { data, error: err } = await supabase
      .from("trips")
      .insert(payload)
      .select()
      .single();
    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }

    // ── Airport driver: create linked trip for fly trips ──
    if (form.trip_type === "fly" && form.airport_driver_id) {
      const airportPayload = {
        driver_id: form.airport_driver_id,
        designated_driver_id: form.airport_driver_id,
        trip_type: "airport",
        city: form.city,
        crm_id: form.crm_id,
        carpage_link: form.carpage_link || null,
        scheduled_pickup: new Date(form.scheduled_pickup).toISOString(),
        notes: `Airport driver for ${form.city}`,
        status: "pending",
        parent_trip_id: data.id,
      };
      const { data: airportData, error: airportErr } = await supabase
        .from("trips")
        .insert(airportPayload)
        .select()
        .single();
      if (airportErr) {
        setError("Trip created but airport driver failed: " + airportErr.message);
      } else if (airportData) {
        onCreated(airportData);
      }
    }

    setSaving(false);
    onCreated(data);

    // Notify assigned drivers
    const driverIds = [form.driver_id, form.second_driver_id, form.airport_driver_id].filter(Boolean);
    if (driverIds.length > 0) {
      fetch("https://yincjogkjvotupzgetqg.supabase.co/functions/v1/notify-trip-assigned", {
        method: "POST",
        headers: {
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trip_id: data.id,
          driver_ids: driverIds,
          city: form.city,
          scheduled_pickup: form.scheduled_pickup ? new Date(form.scheduled_pickup).toISOString() : null,
        }),
      }).catch(() => {});
    }

    setSaved(true);
    setForm((f) => ({
      ...f,
      city: "",
      crm_id: "",
      carpage_link: "",
      notes: "",
      second_driver_id: "",
      designated_driver_id: "",
      airport_driver_id: "",
      stock_numbers: "",
      destination_address: "",
      dealer_plate: "",
      chase_vehicle_stock: "",
      aa_stock_numbers: {},
    aa_driver_ids: [],
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
            <option value="aa">🚐 AA (Convoy)</option>
            <option value="courier">📦 Courier</option>
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
        {/* ── AA: multi-driver selection ── */}
        {form.trip_type === "aa" && (
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Drivers in Convoy (select multiple)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {drivers.map((d) => {
                const selected = form.aa_driver_ids.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`btn ${selected ? "btn-primary" : "btn-ghost"}`}
                    style={{ fontSize: 12, padding: "4px 12px" }}
                    onClick={() => {
                      if (selected) {
                        set("aa_driver_ids", form.aa_driver_ids.filter((id) => id !== d.id));
                      } else {
                        set("aa_driver_ids", [...form.aa_driver_ids, d.id]);
                      }
                    }}
                  >
                    {d.name}{d.willing_to_fly ? " (F)" : ""}
                  </button>
                );
              })}
            </div>
            {form.aa_driver_ids.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                {form.aa_driver_ids.length} driver{form.aa_driver_ids.length !== 1 ? "s" : ""} selected — each gets their own trip record
              </div>
            )}
          </div>
        )}

        {/* ── Single driver for fly, drive, courier ── */}
        {form.trip_type !== "aa" && (
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
        )}

        {/* ── Drive: second driver ── */}
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

        {/* ── Fly: optional airport driver ── */}
        {form.trip_type === "fly" && (
          <div className="field">
            <label>Airport Driver (optional, $45 suggested)</label>
            <select
              value={form.airport_driver_id}
              onChange={(e) => set("airport_driver_id", e.target.value)}
            >
              <option value="">— None —</option>
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

        {/* ── AA: per-driver stock numbers ── */}
        {form.trip_type === "aa" && form.aa_driver_ids.length > 0 && (
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Stock Numbers (per driver)</label>
            {form.aa_driver_ids.map((dId) => {
              const d = drivers.find((dr) => dr.id === dId);
              return (
                <div key={dId} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, minWidth: 120, color: "var(--muted)" }}>{d?.name || "—"}</span>
                  <input
                    type="text"
                    placeholder="AB123, AB124"
                    value={(form.aa_stock_numbers || {})[dId] || ""}
                    onChange={(e) => set("aa_stock_numbers", { ...(form.aa_stock_numbers || {}), [dId]: e.target.value })}
                    style={{ flex: 1 }}
                  />
                </div>
              );
            })}
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
        <div className="field">
          <label>Dealer Plate #</label>
          <input
            type="text"
            placeholder="D-1234"
            value={form.dealer_plate}
            onChange={(e) => set("dealer_plate", e.target.value)}
          />
        </div>
        {form.trip_type === "drive" && (
          <div className="field">
            <label>Chase Vehicle</label>
            <select
              value={form.chase_vehicle_stock}
              onChange={(e) => set("chase_vehicle_stock", e.target.value)}
            >
              <option value="">— Select Chase Vehicle —</option>
              {chaseVehicles.map((v) => (
                <option key={v.id} value={v.stock_number}>
                  {v.stock_number} — {v.year} {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field" style={{ gridColumn: "1 / -1", position: "relative" }}>
          <label>Pickup Address</label>
          <input
            type="text"
            placeholder="Start typing an address..."
            value={form.destination_address}
            onChange={(e) => {
              set("destination_address", e.target.value);
              const val = e.target.value;
              if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);
              if (val.length < 3) { setAddressSuggestions([]); return; }
              addressTimeoutRef.current = setTimeout(async () => {
                try {
                  const res = await fetch(
                    `https://yincjogkjvotupzgetqg.supabase.co/functions/v1/places-autocomplete?input=${encodeURIComponent(val)}`,
                    { headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las" }}
                  );
                  const data = await res.json();
                  setAddressSuggestions(data.predictions || []);
                } catch { setAddressSuggestions([]); }
              }, 300);
            }}
          />
          {addressSuggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", maxHeight: 200, overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}>
              {addressSuggestions.map((s) => (
                <div
                  key={s.place_id}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  onClick={() => {
                    set("destination_address", s.description);
                    setAddressSuggestions([]);
                  }}
                >
                  {s.description}
                </div>
              ))}
            </div>
          )}
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

// ─── EDIT TRIP MODAL (PENDING ONLY) ──────────────────────────────────────────
function EditTripModal({ trip, allProfiles, onSaved, onClose }) {
  const [city, setCity] = useState(trip.city || "");
  const [crmId, setCrmId] = useState(trip.crm_id || "");
  const [tripType, setTripType] = useState(trip.trip_type || "drive");
  const [notes, setNotes] = useState(trip.notes || "");
  const [driverId, setDriverId] = useState(trip.driver_id || "");
  const [secondDriverId, setSecondDriverId] = useState(trip.second_driver_id || "");
  const [pickup, setPickup] = useState(() => {
    if (!trip.scheduled_pickup) return "";
    const d = new Date(trip.scheduled_pickup);
    // Format as local datetime for datetime-local input
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${da}T${h}:${mi}`;
  });
  const [stockNumbers, setStockNumbers] = useState(trip.stock_numbers || "");
  const [destinationAddress, setDestinationAddress] = useState(trip.destination_address || "");
  const [editAddressSuggestions, setEditAddressSuggestions] = useState([]);
  const editAddressTimeoutRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const drivers = allProfiles.filter((p) => p.role === "driver");

  async function handleSave() {
    if (!driverId) {
      setError("Driver is required");
      return;
    }
    setSaving(true);
    setError("");
    const { data, error: err } = await supabase
      .from("trips")
      .update({
        city,
        crm_id: crmId,
        trip_type: tripType,
        notes,
        driver_id: driverId,
        designated_driver_id: driverId,
        second_driver_id: secondDriverId || null,
        scheduled_pickup: pickup ? new Date(pickup).toISOString() : trip.scheduled_pickup,
        stock_numbers: stockNumbers || null,
        destination_address: destinationAddress || null,
      })
      .eq("id", trip.id)
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    // If AA trip with group, sync stock numbers across the group
    if (tripType === "aa" && trip.group_id && stockNumbers !== trip.stock_numbers) {
      await supabase
        .from("trips")
        .update({ stock_numbers: stockNumbers || null })
        .eq("group_id", trip.group_id)
        .neq("id", trip.id);
    }
    onSaved(data);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 500 }}>
        <div className="modal-title">Edit Trip</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          {trip.crm_id} · {trip.city}
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Type</label>
            {trip.group_id || trip.parent_trip_id ? (
              <div style={{ padding: "6px 0", fontSize: 13, color: "var(--muted)" }}>
                {tripTypeLabel(tripType)} <span style={{ fontSize: 11 }}>(locked)</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["fly", "drive", "aa", "courier"].map((t) => (
                  <button
                    key={t}
                    className={`btn ${tripType === t ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1, fontSize: 12 }}
                    onClick={() => setTripType(t)}
                  >
                    {tripTypeLabel(t)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Charlotte, NC" />
          </div>
          <div className="field">
            <label>CRM ID</label>
            <input
              value={crmId}
              onChange={(e) => setCrmId(e.target.value.toUpperCase())}
              placeholder="AB123"
              style={{ textTransform: "uppercase" }}
            />
          </div>
          <div className="field">
            <label>Scheduled Pickup</label>
            <input
              type="datetime-local"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="field">
            <label>Driver</label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Select driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.willing_to_fly ? " (F)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Second Driver</label>
            <select value={secondDriverId} onChange={(e) => setSecondDriverId(e.target.value)}>
              <option value="">None</option>
              {drivers.filter((d) => d.id !== driverId).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.willing_to_fly ? " (F)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Flight info, seller contact, etc."
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1", position: "relative" }}>
            <label>Pickup Address</label>
            <input
              value={destinationAddress}
              onChange={(e) => {
                setDestinationAddress(e.target.value);
                const val = e.target.value;
                if (editAddressTimeoutRef.current) clearTimeout(editAddressTimeoutRef.current);
                if (val.length < 3) { setEditAddressSuggestions([]); return; }
                editAddressTimeoutRef.current = setTimeout(async () => {
                  try {
                    const res = await fetch(
                      `https://yincjogkjvotupzgetqg.supabase.co/functions/v1/places-autocomplete?input=${encodeURIComponent(val)}`,
                      { headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las" }}
                    );
                    const data = await res.json();
                    setEditAddressSuggestions(data.predictions || []);
                  } catch { setEditAddressSuggestions([]); }
                }, 300);
              }}
              placeholder="Start typing an address..."
            />
            {editAddressSuggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", maxHeight: 200, overflowY: "auto",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}>
                {editAddressSuggestions.map((s) => (
                  <div
                    key={s.place_id}
                    style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    onClick={() => {
                      setDestinationAddress(s.description);
                      setEditAddressSuggestions([]);
                    }}
                  >
                    {s.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          {tripType === "aa" && (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Stock Numbers</label>
              <input
                value={stockNumbers}
                onChange={(e) => setStockNumbers(e.target.value)}
                placeholder="A123, B456, C789"
              />
            </div>
          )}
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ opacity: saving ? 0.5 : 1 }}
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

// ─── FINALIZE TRIP MODAL ──────────────────────────────────────────────────────
// ─── TRIP DETAIL MODAL ────────────────────────────────────────────────────────
function TripDetailModal({ trip, allProfiles, photoCounts, onClose, onFinalize, onEdit, onEndTrip, onDelete, onReopen, onCancel, onRestore, isAdmin }) {
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const driver1 = allProfiles.find((p) => p.id === trip.driver_id);
  const driver2 = trip.second_driver_id ? allProfiles.find((p) => p.id === trip.second_driver_id) : null;

  useEffect(() => {
    async function loadPhotos() {
      const { data } = await supabase
        .from("vehicle_photos")
        .select("*")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: true });
      setPhotos(data || []);
      setLoadingPhotos(false);
    }
    loadPhotos();
  }, [trip.id]);

  function getPhotoUrl(storagePath) {
    const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(storagePath);
    return data?.publicUrl;
  }

  const duration = trip.actual_start && trip.actual_end
    ? ((new Date(trip.actual_end) - new Date(trip.actual_start)) / 3600000).toFixed(1)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 640, maxHeight: "85vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 4 }}>Trip Details</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {trip.crm_id || "—"} · {tripTypeLabel(trip.trip_type)}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "6px 16px", fontSize: 11 }} onClick={onClose}>CLOSE</button>
        </div>

        {/* Trip Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: 16, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>DESTINATION</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{trip.city}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>DRIVER(S)</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {driver1?.name || "—"}
              {driver2 && ` + ${driver2.name}`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>STATUS</div>
            <TripStatusBadge status={trip.status} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>PICKUP</div>
            <div style={{ fontSize: 13 }}>
              {new Date(trip.scheduled_pickup).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
              {new Date(trip.scheduled_pickup).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
          {trip.actual_start && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>STARTED</div>
              <div style={{ fontSize: 13 }}>{new Date(trip.actual_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
            </div>
          )}
          {trip.actual_end && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>ENDED</div>
              <div style={{ fontSize: 13 }}>{new Date(trip.actual_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
            </div>
          )}
          {duration && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>DURATION</div>
              <div style={{ fontSize: 13 }}>{duration}h</div>
            </div>
          )}
          {trip.miles > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>MILES</div>
              <div style={{ fontSize: 13 }}>{Number(trip.miles).toFixed(1)} mi</div>
            </div>
          )}
          {trip.dealer_plate && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>DEALER PLATE</div>
              <div style={{ fontSize: 13 }}>{trip.dealer_plate}</div>
            </div>
          )}
          {trip.chase_vehicle_stock && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>CHASE VEHICLE</div>
              <div style={{ fontSize: 13 }}>{trip.chase_vehicle_stock}</div>
            </div>
          )}
          {trip.destination_address && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>ADDRESS</div>
              <div style={{ fontSize: 13 }}>{trip.destination_address}</div>
            </div>
          )}
        </div>

        {/* Vehicle Mileage */}
        {trip.purchased_vehicle_mileage && (
          <div style={{ padding: "12px 16px", background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "var(--radius-sm)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Purchased Vehicle Odometer</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>{Number(trip.purchased_vehicle_mileage).toLocaleString()} mi</span>
          </div>
        )}

        {/* OBD Vehicle Data */}
        {trip.obd_data?.obd_connected && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--info)" }}>
                VEHICLE TELEMETRY
              </div>
              {trip.chase_vehicle_stock && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "3px 10px" }}>
                  Fleet: {trip.chase_vehicle_stock}
                </div>
              )}
            </div>
            {trip.obd_data.vehicle && (
              <div style={{ padding: "10px 14px", background: "var(--bg)", borderLeft: "3px solid var(--info)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  {[trip.obd_data.vehicle.year, trip.obd_data.vehicle.make, trip.obd_data.vehicle.model].filter(Boolean).join(" ")}
                  {trip.obd_data.vehicle.trim ? ` ${trip.obd_data.vehicle.trim}` : ""}
                </div>
                {trip.obd_data.vehicle.vin && (
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", letterSpacing: 1, marginTop: 2 }}>{trip.obd_data.vehicle.vin}</div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {trip.obd_data.vehicle.engineSize && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{trip.obd_data.vehicle.engineSize}L {trip.obd_data.vehicle.cylinders ? `${trip.obd_data.vehicle.cylinders}cyl` : ""}</span>
                  )}
                  {trip.obd_data.vehicle.transmission && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{trip.obd_data.vehicle.transmission}</span>
                  )}
                  {trip.obd_data.vehicle.fuelType && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{trip.obd_data.vehicle.fuelType}</span>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {trip.obd_data.odometer_miles != null && (
                <div style={{ padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>OBD MILES</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{trip.obd_data.odometer_miles}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>miles</div>
                </div>
              )}
              {trip.obd_data.max_speed != null && (
                <div style={{ padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>MAX SPEED</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{trip.obd_data.max_speed}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>mph</div>
                </div>
              )}
              {trip.obd_data.avg_speed != null && (
                <div style={{ padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>AVG SPEED</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{trip.obd_data.avg_speed}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>mph</div>
                </div>
              )}
              {trip.obd_data.max_rpm != null && (
                <div style={{ padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>MAX RPM</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{trip.obd_data.max_rpm?.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>rpm</div>
                </div>
              )}
              {trip.obd_data.fuel_used != null && (
                <div style={{ padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 4 }}>FUEL USED</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{trip.obd_data.fuel_used}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>%</div>
                </div>
              )}
            </div>

            {/* Safety events */}
            {(trip.obd_data.hard_brakes > 0 || trip.obd_data.hard_accelerations > 0 || trip.obd_data.seconds_over_80 > 0 || trip.obd_data.seconds_over_90 > 0) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {trip.obd_data.hard_brakes > 0 && (
                  <div style={{ flex: 1, minWidth: 120, padding: 10, background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--accent)" }}>{trip.obd_data.hard_brakes}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5 }}>HARD BRAKES</div>
                  </div>
                )}
                {trip.obd_data.hard_accelerations > 0 && (
                  <div style={{ flex: 1, minWidth: 120, padding: 10, background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--accent)" }}>{trip.obd_data.hard_accelerations}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5 }}>HARD ACCELS</div>
                  </div>
                )}
                {trip.obd_data.seconds_over_80 > 0 && (
                  <div style={{ flex: 1, minWidth: 120, padding: 10, background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--accent)" }}>{Math.round(trip.obd_data.seconds_over_80 / 60)}m</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5 }}>OVER 80 MPH</div>
                  </div>
                )}
                {trip.obd_data.seconds_over_90 > 0 && (
                  <div style={{ flex: 1, minWidth: 120, padding: 10, background: "rgba(232,90,74,0.06)", border: "1px solid rgba(232,90,74,0.2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--danger)" }}>{Math.round(trip.obd_data.seconds_over_90 / 60)}m</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", letterSpacing: 1.5 }}>OVER 90 MPH</div>
                  </div>
                )}
              </div>
            )}

            {/* Odometer range */}
            {trip.obd_data.odometer_start != null && trip.obd_data.odometer_end != null && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5 }}>START</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.obd_data.odometer_start?.toLocaleString()} mi</div>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 16 }}>&rarr;</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5 }}>END</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.obd_data.odometer_end?.toLocaleString()} mi</div>
                </div>
              </div>
            )}

            {/* Fuel range */}
            {trip.obd_data.fuel_start != null && trip.obd_data.fuel_end != null && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5 }}>FUEL START</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.obd_data.fuel_start}%</div>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 16 }}>&rarr;</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5 }}>FUEL END</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.obd_data.fuel_end}%</div>
                </div>
              </div>
            )}

            {/* Diagnostic codes */}
            {trip.obd_data.diagnostic_codes?.length > 0 && (
              <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--danger)", marginBottom: 8 }}>
                  ENGINE CODES ({trip.obd_data.diagnostic_codes.length})
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {trip.obd_data.diagnostic_codes.map((code, i) => (
                    <span key={i} style={{ padding: "4px 10px", background: "rgba(232,90,74,0.08)", border: "1px solid rgba(232,90,74,0.2)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "var(--danger)", letterSpacing: 1 }}>{code}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {trip.notes && (
          <div style={{ padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
            {trip.notes}
          </div>
        )}

        {/* Photos */}
        {!loadingPhotos && photos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 10 }}>
              VEHICLE PHOTOS ({photos.length})
            </div>
            {selectedPhoto && (
              <div style={{ marginBottom: 12, textAlign: "center" }}>
                <img
                  src={getPhotoUrl(selectedPhoto.storage_path)}
                  alt="Vehicle"
                  style={{ maxWidth: "100%", maxHeight: "40vh", borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {new Date(selectedPhoto.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 6,
                    overflow: "hidden",
                    border: selectedPhoto?.id === photo.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                    aspectRatio: "1",
                  }}
                >
                  <img
                    src={getPhotoUrl(photo.storage_path)}
                    alt="Vehicle"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && trip.status === "pending" && (
            <>
              <button className="btn-edit" style={{ background: "rgba(245,166,35,0.1)", color: "var(--accent)", borderColor: "var(--accent)" }} onClick={() => { onClose(); onEdit(trip); }}>Edit</button>
              <button className="btn-edit" style={{ background: "rgba(120,120,120,0.15)", color: "var(--muted)", borderColor: "var(--muted)" }} onClick={() => { onClose(); onCancel(trip); }}>Cancel</button>
              <button className="btn-edit" style={{ background: "rgba(232,90,74,0.1)", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => { onClose(); onDelete(trip); }}>Delete</button>
            </>
          )}
          {isAdmin && trip.status === "cancelled" && (
            <>
              <button className="btn-edit" style={{ background: "rgba(74,144,226,0.1)", color: "var(--info)", borderColor: "var(--info)" }} onClick={() => { onClose(); onRestore(trip); }}>Restore</button>
              <button className="btn-edit" style={{ background: "rgba(232,90,74,0.1)", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => { onClose(); onDelete(trip); }}>Delete</button>
            </>
          )}
          {isAdmin && trip.status === "in_progress" && (
            <button className="btn-edit" style={{ background: "rgba(232,90,74,0.1)", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => { onClose(); onEndTrip(trip); }}>End Trip</button>
          )}
          {isAdmin && trip.status === "completed" && (
            <>
              <button className="btn-edit" style={{ background: "rgba(74,232,133,0.1)", color: "var(--success)", borderColor: "var(--success)" }} onClick={() => { onClose(); onFinalize(trip); }}>Finalize</button>
              <button className="btn-edit" style={{ background: "rgba(74,144,226,0.1)", color: "var(--info)", borderColor: "var(--info)" }} onClick={() => { onClose(); onReopen(trip); }}>Reopen</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VEHICLE PHOTOS MODAL ─────────────────────────────────────────────────────
function VehiclePhotosModal({ tripId, tripLabel, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("vehicle_photos")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      setPhotos(data || []);
      setLoading(false);
    }
    load();
  }, [tripId]);

  function getPhotoUrl(storagePath) {
    const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(storagePath);
    return data?.publicUrl;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 700, maxHeight: "85vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 4 }}>Vehicle Photos</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{tripLabel}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "6px 16px", fontSize: 11 }} onClick={onClose}>CLOSE</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading photos...</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No photos uploaded for this trip.</div>
        ) : (
          <>
            {selectedPhoto && (
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <img
                  src={getPhotoUrl(selectedPhoto.storage_path)}
                  alt="Vehicle"
                  style={{ maxWidth: "100%", maxHeight: "50vh", borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                  {new Date(selectedPhoto.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 6,
                    overflow: "hidden",
                    border: selectedPhoto?.id === photo.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                    aspectRatio: "1",
                  }}
                >
                  <img
                    src={getPhotoUrl(photo.storage_path)}
                    alt="Vehicle"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FinalizeTripModal({ trip, allProfiles, onFinalized, onClose, canSeePay = true }) {
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

  // Auto-fill pay: hourly_wage * hours if available, else $45 for AA/courier/airport
  function calcPay(driver, hours) {
    // AA, Courier, Airport always default to $45 flat
    if (["aa", "courier", "airport"].includes(trip.trip_type)) return "45";
    if (driver?.hourly_wage && hours) {
      return (Number(driver.hourly_wage) * Number(hours)).toFixed(2);
    }
    return "";
  }

  // Auto-fetch ticket cost from flight monitor for fly trips
  const [fetchedTicketCost, setFetchedTicketCost] = useState(null);
  useEffect(() => {
    if (trip.trip_type !== "fly" || !driver1?.name) return;
    fetch("https://yincjogkjvotupzgetqg.supabase.co/functions/v1/flight-proxy/api/flights/today", {
      headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las" },
    })
      .then((r) => r.json())
      .then((flights) => {
        const driverName = driver1.name.toLowerCase();
        const match = flights.find((f) =>
          f.passenger_name && f.passenger_name.toLowerCase().includes(driverName.split(" ")[0].toLowerCase())
          && f.ticket_cost
        );
        if (match?.ticket_cost) {
          setFetchedTicketCost(String(match.ticket_cost));
          setForm((prev) => prev.flight_cost ? prev : { ...prev, flight_cost: String(match.ticket_cost) });
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    pay: calcPay(driver1, duration),
    pay2: driver2 ? calcPay(driver2, duration) : "",
    hours: duration,
    miles: String(trip.miles ?? ""),
    estimated_cost: String(trip.estimated_cost ?? ""),
    flight_cost: String(trip.flight_cost ?? ""),
    rideshare_cost: String(trip.rideshare_cost ?? ""),
    fuel_cost: String(trip.fuel_cost ?? ""),
    other_cost: String(trip.other_cost ?? ""),
    stock_numbers: trip.stock_numbers ?? "",
    recon_missed: false,
    turned_down: false,
    has_additional_recon: false,
    additional_recon_cost: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Compute actual cost from itemized fields + driver pay
  const computedActualCost = [
    form.flight_cost, form.rideshare_cost, form.fuel_cost, form.other_cost,
    form.pay, form.pay2,
  ].reduce((sum, v) => sum + (Number(v) || 0), 0);

  async function handleFinalize() {
    if (canSeePay && !form.pay) {
      setError("Pay is required.");
      return;
    }
    if (canSeePay && driver2 && !form.pay2) {
      setError("Pay for both drivers is required.");
      return;
    }
    setSaving(true);
    setError("");

    const costFields = {
      flight_cost: form.flight_cost ? Number(form.flight_cost) : null,
      rideshare_cost: form.rideshare_cost ? Number(form.rideshare_cost) : null,
      fuel_cost: form.fuel_cost ? Number(form.fuel_cost) : null,
      other_cost: form.other_cost ? Number(form.other_cost) : null,
    };

    // Update trip to finalized
    const { error: tripErr } = await supabase
      .from("trips")
      .update({
        status: "finalized",
        miles: form.miles ? Number(form.miles) : 0,
        actual_cost: computedActualCost,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
        stock_numbers: form.stock_numbers || null,
        turned_down: form.turned_down,
        has_additional_recon: form.has_additional_recon,
        additional_recon_cost: form.has_additional_recon && form.additional_recon_cost ? Number(form.additional_recon_cost) : null,
        ...costFields,
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
      actual_cost: computedActualCost,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
      recon_missed: form.recon_missed,
      trip_id: trip.id,
      trip_type: trip.trip_type,
      stock_numbers: form.stock_numbers || null,
      turned_down: form.turned_down,
      has_additional_recon: form.has_additional_recon,
      additional_recon_cost: form.has_additional_recon && form.additional_recon_cost ? Number(form.additional_recon_cost) : null,
      ...costFields,
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

    // Add trip miles to chase vehicle if assigned
    if (trip.chase_vehicle_stock && form.miles) {
      const { data: chaseVehicle } = await supabase
        .from("chase_vehicles")
        .select("id, current_mileage, oil_change_due_mileage, year, make, model")
        .eq("stock_number", trip.chase_vehicle_stock)
        .single();
      if (chaseVehicle) {
        const tripMiles = Number(form.miles) || 0;
        const newMileage = Number(chaseVehicle.current_mileage || 0) + tripMiles;
        await supabase.from("chase_vehicles").update({
          current_mileage: newMileage,
          updated_at: new Date().toISOString(),
        }).eq("id", chaseVehicle.id);
        await supabase.from("chase_vehicle_mileage_log").insert({
          vehicle_id: chaseVehicle.id,
          trip_id: trip.id,
          miles_added: tripMiles,
          trip_city: trip.city,
          trip_date: (trip.actual_end ? new Date(trip.actual_end) : new Date()).toISOString().slice(0, 10),
          driver_name: driver1?.name || "Unknown",
        });

        // Check if oil change is now due
        if (chaseVehicle.oil_change_due_mileage && newMileage >= Number(chaseVehicle.oil_change_due_mileage)) {
          const vehicleLabel = `${chaseVehicle.year || ""} ${chaseVehicle.make || ""} ${chaseVehicle.model || ""} (${trip.chase_vehicle_stock})`.trim();
          await supabase.from("system_logs").insert({
            source: "web",
            level: "warning",
            event: "oil_change_due",
            message: `Oil change due for ${vehicleLabel} — now at ${newMileage.toLocaleString()} mi (due at ${Number(chaseVehicle.oil_change_due_mileage).toLocaleString()} mi)`,
            metadata: { vehicle_id: chaseVehicle.id, stock_number: trip.chase_vehicle_stock, current_mileage: newMileage, due_mileage: chaseVehicle.oil_change_due_mileage },
          });
          // Push notification to admins
          try {
            const { data: adminTokens } = await supabase
              .from("profiles")
              .select("push_token")
              .in("role", ["admin", "manager"])
              .not("push_token", "is", null);
            const tokens = (adminTokens || []).map(a => a.push_token).filter(t => t?.startsWith("ExponentPushToken"));
            if (tokens.length > 0) {
              await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens.map(to => ({
                  to,
                  sound: "default",
                  title: "🛢️ Oil Change Due",
                  body: `${vehicleLabel} has reached ${newMileage.toLocaleString()} mi — oil change was due at ${Number(chaseVehicle.oil_change_due_mileage).toLocaleString()} mi`,
                  data: { type: "oil_change_due", vehicle_id: chaseVehicle.id },
                }))),
              });
            }
          } catch {}
        }
      }
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
            {tripTypeLabel(trip.trip_type)}
            {trip.actual_start && trip.actual_end && (
              <span style={{ marginLeft: 12 }}>⏱ {duration}h recorded</span>
            )}
          </div>
        </div>
        <div className="form-grid">
          {canSeePay && (
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
          )}
          {canSeePay && driver2 && (
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
            <label>Estimated Cost ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.estimated_cost}
              onChange={(e) => set("estimated_cost", e.target.value)}
            />
          </div>
        </div>

        {/* ── Itemized Cost Breakdown ── */}
        <div style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 10 }}>
            COST BREAKDOWN
          </div>
          <div className="form-grid">
            {(trip.trip_type === "fly" || trip.trip_type === "airport") && (
              <>
                <div className="field">
                  <label>Flight Ticket ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.flight_cost}
                    onChange={(e) => set("flight_cost", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Rideshare ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.rideshare_cost}
                    onChange={(e) => set("rideshare_cost", e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>Fuel ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.fuel_cost}
                onChange={(e) => set("fuel_cost", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Other Expenses ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.other_cost}
                onChange={(e) => set("other_cost", e.target.value)}
              />
            </div>
          </div>
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 700,
          }}>
            <span style={{ color: "var(--muted)" }}>Total Actual Cost</span>
            <span style={{ color: "var(--text)" }}>${computedActualCost.toFixed(2)}</span>
          </div>
          {form.estimated_cost && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: computedActualCost > Number(form.estimated_cost) ? "var(--danger)" : "var(--success, #4ade80)",
              marginTop: 4,
            }}>
              <span>Variance</span>
              <span>
                {computedActualCost > Number(form.estimated_cost) ? "+" : ""}
                ${(computedActualCost - Number(form.estimated_cost)).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* ── Stock Numbers (editable for AA trips) ── */}
        {trip.trip_type === "aa" && (
          <div className="field" style={{ marginTop: 10 }}>
            <label>Stock Numbers</label>
            <input
              type="text"
              placeholder="A123, B456, C789"
              value={form.stock_numbers ?? trip.stock_numbers ?? ""}
              onChange={(e) => set("stock_numbers", e.target.value)}
            />
          </div>
        )}

        <div className="checkbox-row">
          <input
            type="checkbox"
            id="fin-turned-down"
            checked={form.turned_down}
            onChange={(e) => set("turned_down", e.target.checked)}
          />
          <label
            htmlFor="fin-turned-down"
            style={{
              color: form.turned_down ? "var(--accent)" : "var(--text)",
            }}
          >
            Vehicle Turned Down (no purchase — trip cost is a loss)
          </label>
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
            Driver Missed Recon (resets bonus streak)
          </label>
        </div>

        <div className="checkbox-row">
          <input
            type="checkbox"
            id="fin-additional-recon"
            checked={form.has_additional_recon}
            onChange={(e) => set("has_additional_recon", e.target.checked)}
          />
          <label
            htmlFor="fin-additional-recon"
            style={{
              color: form.has_additional_recon ? "var(--accent)" : "var(--text)",
            }}
          >
            Additional Recon (unexpected repairs — deducted from variance pool)
          </label>
        </div>
        {form.has_additional_recon && (
          <div className="field" style={{ marginTop: 8 }}>
            <label>Additional Recon Cost ($)</label>
            <input
              type="number"
              placeholder="Enter amount when known"
              value={form.additional_recon_cost}
              onChange={(e) => set("additional_recon_cost", e.target.value)}
            />
          </div>
        )}

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

// ─── AA GROUP FINALIZE MODAL ─────────────────────────────────────────────────
function AAGroupFinalizeModal({ groupTrips, allProfiles, onFinalized, onClose }) {
  const [driverForms, setDriverForms] = useState(() =>
    groupTrips.map((trip) => ({
      tripId: trip.id,
      driverId: trip.driver_id,
      pay: "45",
      hours: trip.actual_start && trip.actual_end
        ? ((new Date(trip.actual_end) - new Date(trip.actual_start)) / 3600000).toFixed(1)
        : "",
      miles: String(trip.miles ?? ""),
      stockNumbers: trip.stock_numbers || "",
      fuelCost: "",
    })),
  );
  const [otherCost, setOtherCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setDriverField(idx, key, value) {
    setDriverForms((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  }

  const totalPay = driverForms.reduce((s, f) => s + (Number(f.pay) || 0), 0);
  const totalFuel = driverForms.reduce((s, f) => s + (Number(f.fuelCost) || 0), 0);
  const computedActualCost = totalPay + totalFuel + (Number(otherCost) || 0);

  async function handleFinalizeDriver(idx) {
    const df = driverForms[idx];
    if (!df.pay) { setError("Pay is required."); return; }
    setSaving(true);
    setError("");

    const trip = groupTrips.find((t) => t.id === df.tripId);
    const driverCost = Number(df.pay) + (Number(df.fuelCost) || 0) + (Number(otherCost) || 0);

    const { error: tripErr } = await supabase
      .from("trips")
      .update({
        status: "finalized",
        pay: Number(df.pay),
        miles: df.miles ? Number(df.miles) : 0,
        hours: df.hours ? Number(df.hours) : 0,
        stock_numbers: df.stockNumbers || null,
        fuel_cost: df.fuelCost ? Number(df.fuelCost) : null,
        other_cost: otherCost ? Number(otherCost) : null,
        actual_cost: driverCost,
        estimated_cost: 0,
      })
      .eq("id", df.tripId);

    if (tripErr) { setError(tripErr.message); setSaving(false); return; }

    await supabase.from("entries").insert({
      driver_id: df.driverId,
      trip_id: df.tripId,
      date: (trip.actual_end ? new Date(trip.actual_end) : new Date()).toISOString().slice(0, 10),
      pay: Number(df.pay),
      hours: df.hours ? Number(df.hours) : 0,
      miles: df.miles ? Number(df.miles) : 0,
      city: trip.city,
      crm_id: trip.crm_id,
      carpage_link: trip.carpage_link,
      actual_cost: driverCost,
      estimated_cost: 0,
      trip_type: "aa",
      stock_numbers: df.stockNumbers || null,
      fuel_cost: df.fuelCost ? Number(df.fuelCost) : null,
      other_cost: otherCost ? Number(otherCost) : null,
    });

    setSaving(false);
    onFinalized(df.tripId);
  }

  async function handleFinalizeAll() {
    const missing = driverForms.find((f) => !f.pay);
    if (missing) {
      const driver = allProfiles.find((p) => p.id === missing.driverId);
      setError(`Pay is required for ${driver?.name || "all drivers"}.`);
      return;
    }
    setSaving(true);
    setError("");

    for (const df of driverForms) {
      const trip = groupTrips.find((t) => t.id === df.tripId);
      if (trip.status === "finalized") continue;

      const driverCost = Number(df.pay) + (Number(df.fuelCost) || 0) + (Number(otherCost) || 0);

      const { error: tripErr } = await supabase
        .from("trips")
        .update({
          status: "finalized",
          pay: Number(df.pay),
          miles: df.miles ? Number(df.miles) : 0,
          hours: df.hours ? Number(df.hours) : 0,
          stock_numbers: df.stockNumbers || null,
          fuel_cost: df.fuelCost ? Number(df.fuelCost) : null,
          other_cost: otherCost ? Number(otherCost) : null,
          actual_cost: driverCost,
          estimated_cost: 0,
        })
        .eq("id", df.tripId);

      if (tripErr) { setError(tripErr.message); setSaving(false); return; }

      await supabase.from("entries").insert({
        driver_id: df.driverId,
        trip_id: df.tripId,
        date: (trip.actual_end ? new Date(trip.actual_end) : new Date()).toISOString().slice(0, 10),
        pay: Number(df.pay),
        hours: df.hours ? Number(df.hours) : 0,
        miles: df.miles ? Number(df.miles) : 0,
        city: trip.city,
        crm_id: trip.crm_id,
        carpage_link: trip.carpage_link,
        actual_cost: driverCost,
        estimated_cost: 0,
        trip_type: "aa",
        stock_numbers: df.stockNumbers || null,
        fuel_cost: df.fuelCost ? Number(df.fuelCost) : null,
        other_cost: otherCost ? Number(otherCost) : null,
      });
    }

    setSaving(false);
    groupTrips.forEach((t) => onFinalized(t.id));
  }

  const label = aaGroupLabel(groupTrips[0]);
  const allCompleted = groupTrips.every((t) => t.status === "completed" || t.status === "finalized");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 640, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Finalize {label}</div>
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {label} — {groupTrips[0]?.city} · {groupTrips.length} driver{groupTrips.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Per-driver section */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 8 }}>
          DRIVERS
        </div>
        {driverForms.map((df, idx) => {
          const driver = allProfiles.find((p) => p.id === df.driverId);
          const trip = groupTrips.find((t) => t.id === df.tripId);
          const isFinalized = trip?.status === "finalized";
          return (
            <div
              key={df.tripId}
              style={{
                padding: "12px 14px",
                background: isFinalized ? "rgba(74,232,133,0.05)" : "var(--bg)",
                border: `1px solid ${isFinalized ? "var(--success)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                marginBottom: 8,
                opacity: isFinalized ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{driver?.name || "—"}</span>
                {isFinalized ? (
                  <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>FINALIZED</span>
                ) : (
                  <button
                    className="btn-edit"
                    style={{ background: "rgba(74,232,133,0.1)", color: "var(--success)", borderColor: "var(--success)", fontSize: 11 }}
                    onClick={() => handleFinalizeDriver(idx)}
                    disabled={saving}
                  >
                    Finalize
                  </button>
                )}
              </div>
              {!isFinalized && (
                <>
                  <div className="field" style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 11 }}>Stock Numbers</label>
                    <input
                      type="text"
                      placeholder="AB123, AB124"
                      value={df.stockNumbers}
                      onChange={(e) => setDriverField(idx, "stockNumbers", e.target.value)}
                    />
                  </div>
                  <div className="form-grid" style={{ gap: 8 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11 }}>Pay ($)</label>
                      <input
                        type="number"
                        placeholder="45.00"
                        value={df.pay}
                        onChange={(e) => setDriverField(idx, "pay", e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11 }}>Gas ($)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={df.fuelCost}
                        onChange={(e) => setDriverField(idx, "fuelCost", e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11 }}>Hours</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={df.hours}
                        onChange={(e) => setDriverField(idx, "hours", e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11 }}>Miles</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={df.miles}
                        onChange={(e) => setDriverField(idx, "miles", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Other shared costs */}
        <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div className="form-grid">
            <div className="field">
              <label>Other Shared Expenses ($)</label>
              <input type="number" placeholder="0.00" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: "var(--muted)" }}>Total (All Drivers + Costs)</span>
            <span style={{ color: "var(--text)" }}>${computedActualCost.toFixed(2)}</span>
          </div>
        </div>

        {error && <div className="error-msg" style={{ textAlign: "left", marginTop: 8 }}>{error}</div>}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 12 }} onClick={onClose}>Cancel</button>
          {allCompleted && (
            <button
              className="btn btn-primary"
              style={{ padding: "8px 16px", fontSize: 12 }}
              onClick={handleFinalizeAll}
              disabled={saving}
            >
              {saving ? "Saving..." : `Finalize All ${groupTrips.length} Drivers →`}
            </button>
          )}
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
  isAdmin,
  canSeePay,
}) {
  const [view, setView] = useState(prefillData ? "create" : "active"); // active | all | create
  const [finalizingTrip, setFinalizingTrip] = useState(null);
  const [finalizingAAGroup, setFinalizingAAGroup] = useState(null); // array of trips
  const [editingTrip, setEditingTrip] = useState(null);
  const [acting, setActing] = useState(null); // trip id being acted on
  const [expandedGroups, setExpandedGroups] = useState({}); // group_id -> bool
  const [editingStockNumbers, setEditingStockNumbers] = useState(null); // group_id
  const [viewingPhotos, setViewingPhotos] = useState(null); // { tripId, label }
  const [viewingTrip, setViewingTrip] = useState(null); // full trip object
  const [photoCounts, setPhotoCounts] = useState({});
  const [stockNumberDraft, setStockNumberDraft] = useState("");

  // Load photo counts for trips
  useEffect(() => {
    async function loadPhotoCounts() {
      const { data } = await supabase.from("vehicle_photos").select("trip_id");
      if (!data) return;
      const counts = {};
      data.forEach((p) => { counts[p.trip_id] = (counts[p.trip_id] || 0) + 1; });
      setPhotoCounts(counts);
    }
    loadPhotoCounts();
  }, [trips]);

  async function handleEndTrip(trip) {
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "completed", actual_end: new Date().toISOString() })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data) {
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      // Clean up live location so driver disappears from Live map
      await supabase.from("driver_locations").delete().eq("driver_id", trip.driver_id);
      if (trip.second_driver_id) {
        await supabase.from("driver_locations").delete().eq("driver_id", trip.second_driver_id);
      }
      // Close any unclosed stops for this trip
      await supabase.from("trip_stops")
        .update({ ended_at: new Date().toISOString(), duration_minutes: 0 })
        .eq("trip_id", trip.id)
        .is("ended_at", null);
      // Notify admins
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-trip-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ trip_id: trip.id, driver_id: trip.driver_id, action: "ended" }),
        });
      } catch {}
    }
  }

  async function handleDeleteTrip(trip) {
    if (!confirm(`Delete trip ${trip.crm_id || trip.city || trip.id}? This cannot be undone.`)) return;
    setActing(trip.id);
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    setActing(null);
    if (!error) setTrips((prev) => prev.filter((t) => t.id !== trip.id));
  }

  async function handleRestoreCancelledTrip(trip) {
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "pending" })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data) {
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    } else if (error) {
      alert(`Failed to restore: ${error.message}`);
    }
  }

  async function handleCancelTrip(trip) {
    if (!confirm(
      `Cancel trip ${trip.crm_id || trip.city || trip.id}?\n\n` +
      `The trip will be marked as cancelled and removed from the driver's dashboard. ` +
      `This is reversible — you can revert the status later if needed.`
    )) return;
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "cancelled" })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data) {
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    } else if (error) {
      alert(`Failed to cancel: ${error.message}`);
    }
  }

  async function handleReopenTrip(trip) {
    if (!confirm(
      `Reopen trip ${trip.crm_id || trip.city || trip.id}?\n\n` +
      `This will set the trip back to in-progress and notify ${trip.designated_driver_id ? 'the designated driver' : 'the driver'} to resume tracking. ` +
      `Existing miles and hours will be preserved.`
    )) return;
    setActing(trip.id);
    const { data, error } = await supabase
      .from("trips")
      .update({ status: "in_progress", actual_end: null })
      .eq("id", trip.id)
      .select()
      .single();
    setActing(null);
    if (!error && data) {
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      // Notify the driver
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-trip-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            trip_id: trip.id,
            driver_id: trip.designated_driver_id || trip.driver_id,
            action: 'reopened',
          }),
        });
      } catch {}
    } else if (error) {
      alert(`Failed to reopen: ${error.message}`);
    }
  }

  async function handleSaveStockNumbers(groupId, value) {
    const groupTrips = trips.filter((t) => t.group_id === groupId);
    const ids = groupTrips.map((t) => t.id);
    const { error } = await supabase
      .from("trips")
      .update({ stock_numbers: value || null })
      .in("id", ids);
    if (!error) {
      setTrips((prev) =>
        prev.map((t) => (ids.includes(t.id) ? { ...t, stock_numbers: value || null } : t)),
      );
    }
    setEditingStockNumbers(null);
  }

  const active = trips.filter((t) =>
    ["pending", "in_progress"].includes(t.status),
  );
  const needsFinalization = trips.filter((t) => t.status === "completed");
  const all = trips;
  const displayed = view === "create" ? [] : view === "active" ? active : all;

  // Group AA trips by group_id, leave others as individual
  function buildDisplayItems(tripList) {
    const items = [];
    const seenGroups = new Set();
    const sorted = [...tripList].sort(
      (a, b) => new Date(b.scheduled_pickup) - new Date(a.scheduled_pickup),
    );
    for (const trip of sorted) {
      if (trip.trip_type === "aa" && trip.group_id) {
        if (seenGroups.has(trip.group_id)) continue;
        seenGroups.add(trip.group_id);
        const groupTrips = sorted.filter((t) => t.group_id === trip.group_id);
        items.push({ type: "aa_group", group_id: trip.group_id, trips: groupTrips });
      } else {
        items.push({ type: "trip", trip });
      }
    }
    return items;
  }

  const displayItems = buildDisplayItems(displayed);

  function getDriverNames(trip) {
    const p1 = allProfiles.find((p) => p.id === trip.driver_id);
    const p2 = trip.second_driver_id ? allProfiles.find((p) => p.id === trip.second_driver_id) : null;
    const n1 = p1 ? `${p1.name}${p1.willing_to_fly ? ' (F)' : ''}` : "—";
    const n2 = p2 ? `${p2.name}${p2.willing_to_fly ? ' (F)' : ''}` : null;
    return n2 ? `${n1} + ${n2}` : n1;
  }

  function handleFinalized(tripId) {
    const trip = trips.find((t) => t.id === tripId);
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: "finalized" } : t)),
    );
    setFinalizingTrip(null);
    // Clean up live location
    if (trip?.driver_id) supabase.from("driver_locations").delete().eq("driver_id", trip.driver_id);
    if (trip?.second_driver_id) supabase.from("driver_locations").delete().eq("driver_id", trip.second_driver_id);
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
    <div>
      {finalizingTrip && (
        <FinalizeTripModal
          trip={finalizingTrip}
          allProfiles={allProfiles}
          onFinalized={handleFinalized}
          onClose={() => setFinalizingTrip(null)}
          canSeePay={canSeePay}
        />
      )}
      {finalizingAAGroup && (
        <AAGroupFinalizeModal
          groupTrips={finalizingAAGroup}
          allProfiles={allProfiles}
          onFinalized={(tripId) => {
            handleFinalized(tripId);
            // If all in group are finalized, close modal
            const remaining = finalizingAAGroup.filter(
              (t) => t.id !== tripId && t.status !== "finalized",
            );
            if (remaining.length === 0) setFinalizingAAGroup(null);
            else setFinalizingAAGroup((prev) =>
              prev.map((t) => (t.id === tripId ? { ...t, status: "finalized" } : t)),
            );
          }}
          onClose={() => setFinalizingAAGroup(null)}
        />
      )}
      {viewingTrip && (
        <TripDetailModal
          trip={viewingTrip}
          allProfiles={allProfiles}
          photoCounts={photoCounts}
          isAdmin={isAdmin}
          onClose={() => setViewingTrip(null)}
          onFinalize={(t) => { setViewingTrip(null); setFinalizingTrip(t); }}
          onEdit={(t) => { setViewingTrip(null); setEditingTrip({ ...t }); }}
          onEndTrip={(t) => { setViewingTrip(null); handleEndTrip(t); }}
          onDelete={(t) => { setViewingTrip(null); handleDeleteTrip(t); }}
          onReopen={(t) => { setViewingTrip(null); handleReopenTrip(t); }}
          onCancel={(t) => { setViewingTrip(null); handleCancelTrip(t); }}
          onRestore={(t) => { setViewingTrip(null); handleRestoreCancelledTrip(t); }}
        />
      )}
      {viewingPhotos && (
        <VehiclePhotosModal
          tripId={viewingPhotos.tripId}
          tripLabel={viewingPhotos.label}
          onClose={() => setViewingPhotos(null)}
        />
      )}
      {editingTrip && (
        <EditTripModal
          trip={editingTrip}
          allProfiles={allProfiles}
          onSaved={(updated) => {
            setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setEditingTrip(null);
          }}
          onClose={() => setEditingTrip(null)}
        />
      )}

      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        {[
          ["active", `Active (${active.length})`],
          ["all", `All Trips (${all.length})${needsFinalization.length > 0 ? ` · ${needsFinalization.length} to finalize` : ""}`],
          isAdmin && ["create", "＋ Create Trip"],
        ].filter(Boolean).map(([v, label]) => (
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
                {displayItems.map((item) => {
                  // ── AA GROUP ROW ──
                  if (item.type === "aa_group") {
                    const { group_id, trips: groupTrips } = item;
                    const expanded = expandedGroups[group_id];
                    const label = aaGroupLabel(groupTrips[0]);
                    const driverNames = groupTrips.map((t) => {
                      const p = allProfiles.find((p) => p.id === t.driver_id);
                      return p?.name || "—";
                    }).join(", ");
                    const statuses = groupTrips.map((t) => t.status);
                    const anyCompleted = statuses.includes("completed");
                    const allFinalized = statuses.every((s) => s === "finalized");
                    const groupStatus = allFinalized ? "finalized" : anyCompleted ? "completed" : statuses.includes("in_progress") ? "in_progress" : "pending";

                    return (
                      <Fragment key={group_id}>
                        <tr
                          style={{ cursor: "pointer", background: expanded ? "rgba(245,166,35,0.03)" : undefined }}
                          onClick={() => setExpandedGroups((prev) => ({ ...prev, [group_id]: !prev[group_id] }))}
                        >
                          <td><TripStatusBadge status={groupStatus} /></td>
                          <td style={{ whiteSpace: "nowrap" }}>🚐 AA</td>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ color: "var(--accent)", marginRight: 6 }}>{expanded ? "▼" : "▶"}</span>
                            {label} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>({groupTrips.length} drivers)</span>
                            {/* Stock numbers summary (per-driver, shown aggregated) */}
                            {(() => {
                              const allStocks = groupTrips.map(t => t.stock_numbers).filter(Boolean).join(", ");
                              return allStocks ? (
                                <div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>
                                  Stock: {allStocks}
                                </div>
                              ) : null;
                            })()}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{groupTrips[0]?.crm_id}</td>
                          <td>{groupTrips[0]?.city}</td>
                          <td style={{ color: "var(--muted)", fontSize: 12 }}>
                            {new Date(groupTrips[0].scheduled_pickup).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td style={{ color: "var(--muted)", fontSize: 12 }}>—</td>
                          <td style={{ color: "var(--muted)", fontSize: 12 }}>—</td>
                          <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                            {isAdmin && anyCompleted && !allFinalized && (
                              <button
                                className="btn-edit"
                                style={{ background: "rgba(74,232,133,0.1)", color: "var(--success)", borderColor: "var(--success)" }}
                                onClick={() => setFinalizingAAGroup(groupTrips)}
                              >
                                Finalize Group
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Expanded individual driver rows */}
                        {expanded && groupTrips.map((trip) => (
                          <tr key={trip.id} style={{ background: "rgba(245,166,35,0.02)" }}>
                            <td style={{ paddingLeft: 28 }}><TripStatusBadge status={trip.status} /></td>
                            <td></td>
                            <td style={{ fontWeight: 600, paddingLeft: 28 }}>
                              {(() => { const p = allProfiles.find((p) => p.id === trip.driver_id); return p ? p.name : "—"; })()}
                            </td>
                            <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{trip.crm_id}</td>
                            <td>{trip.city}</td>
                            <td style={{ color: "var(--muted)", fontSize: 12 }}>
                              {new Date(trip.scheduled_pickup).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                              {new Date(trip.scheduled_pickup).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: 12 }}>
                              {trip.actual_start ? new Date(trip.actual_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: 12 }}>
                              {trip.actual_end ? new Date(trip.actual_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {isAdmin && trip.status === "pending" && (
                                <>
                                  <button
                                    className="btn-edit"
                                    style={{ background: "rgba(245,166,35,0.1)", color: "var(--accent)", borderColor: "var(--accent)" }}
                                    onClick={() => setEditingTrip({ ...trip })}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn-edit"
                                    style={{ background: "rgba(232,90,74,0.1)", color: "var(--danger)", borderColor: "var(--danger)" }}
                                    onClick={() => handleDeleteTrip(trip)}
                                    disabled={acting === trip.id}
                                  >
                                    {acting === trip.id ? "..." : "Delete"}
                                  </button>
                                </>
                              )}
                              {isAdmin && trip.status === "in_progress" && (
                                <button
                                  className="btn-edit"
                                  style={{ background: "rgba(232,90,74,0.1)", color: "var(--danger)", borderColor: "var(--danger)" }}
                                  onClick={() => handleEndTrip(trip)}
                                  disabled={acting === trip.id}
                                >
                                  {acting === trip.id ? "Ending..." : "⏹ End"}
                                </button>
                              )}
                              {isAdmin && trip.status === "completed" && (
                                <button
                                  className="btn-edit"
                                  style={{ background: "rgba(74,232,133,0.1)", color: "var(--success)", borderColor: "var(--success)" }}
                                  onClick={() => setFinalizingTrip(trip)}
                                >
                                  Finalize
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  }

                  // ── REGULAR TRIP ROW ──
                  const trip = item.trip;
                  const hasDetail = trip.purchased_vehicle_mileage || (photoCounts[trip.id] || 0) > 0 || trip.destination_address || trip.dealer_plate || trip.notes;
                  return (
                    <tr
                      key={trip.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setViewingTrip(trip)}
                    >
                      <td>
                        <TripStatusBadge status={trip.status} />
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{tripTypeLabel(trip.trip_type)}</td>
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
                      <td>
                        {trip.city}
                        {(trip.purchased_vehicle_mileage || photoCounts[trip.id] > 0) && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)" }}>
                            {trip.purchased_vehicle_mileage ? "📋" : ""}
                            {photoCounts[trip.id] > 0 ? ` 📸${photoCounts[trip.id]}` : ""}
                          </span>
                        )}
                      </td>
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
                      <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        {isAdmin && trip.status === "pending" && (
                          <>
                            <button
                              className="btn-edit"
                              style={{
                                background: "rgba(245,166,35,0.1)",
                                color: "var(--accent)",
                                borderColor: "var(--accent)",
                              }}
                              onClick={() => setEditingTrip({ ...trip })}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-edit"
                              style={{
                                background: "rgba(232,90,74,0.1)",
                                color: "var(--danger)",
                                borderColor: "var(--danger)",
                              }}
                              onClick={() => handleDeleteTrip(trip)}
                              disabled={acting === trip.id}
                            >
                              {acting === trip.id ? "..." : "Delete"}
                            </button>
                          </>
                        )}
                        {isAdmin && trip.status === "in_progress" && (
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
                        {isAdmin && trip.status === "completed" && (
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DRIVER TRIPS ─────────────────────────────────────────────────────────────
function DriverTrips({ driver, trips, setTrips, allProfiles }) {
  const [acting, setActing] = useState(null); // trip id being acted on

  const isDesignated = (trip) => trip.designated_driver_id === driver.id;
  const myTrips = trips.filter(
    (t) => t.driver_id === driver.id || t.second_driver_id === driver.id,
  );

  function getLinkedInfo(trip) {
    if (trip.trip_type === "airport" && trip.parent_trip_id) {
      const parent = trips.find((t) => t.id === trip.parent_trip_id);
      if (parent) {
        const p = allProfiles?.find((pr) => pr.id === parent.driver_id);
        return p ? `Driving to airport: ${p.name}` : null;
      }
    }
    if (trip.trip_type === "fly") {
      const airportTrip = trips.find((t) => t.parent_trip_id === trip.id && t.trip_type === "airport");
      if (airportTrip) {
        const p = allProfiles?.find((pr) => pr.id === airportTrip.driver_id);
        return p ? `Airport driver: ${p.name}` : null;
      }
    }
    return null;
  }
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
    if (!error && data) {
      setTrips((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      await supabase.from("driver_locations").delete().eq("driver_id", trip.driver_id);
      if (trip.second_driver_id) {
        await supabase.from("driver_locations").delete().eq("driver_id", trip.second_driver_id);
      }
      // Close any unclosed stops for this trip — without this the live map
      // shows the stop forever (see Jennifer Jones 22081m incident, 2026-05).
      await supabase.from("trip_stops")
        .update({ ended_at: new Date().toISOString(), duration_minutes: 0 })
        .eq("trip_id", trip.id)
        .is("ended_at", null);
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-trip-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ trip_id: trip.id, driver_id: trip.driver_id, action: "ended" }),
        });
      } catch {}
    }
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
                {tripTypeLabel(trip.trip_type)}
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
            {getLinkedInfo(trip) && (
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontWeight: 600 }}>
                {getLinkedInfo(trip)}
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

// ─── CAPACITY CALENDAR ────────────────────────────────────────────────────────
function CapacityCalendar({ isAdmin }) {
  const [capacityData, setCapacityData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(false);

  function getRollingWeek() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }
  const week = getRollingWeek();

  function toDateStr(date) { return date.toISOString().slice(0, 10); }
  function toDisplayLabel(date) {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  function isTodayCheck(date) {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  }

  async function loadCapacity() {
    setError(false);
    setLoading(true);
    try {
      const dateStrs = week.map(toDateStr);
      const { data, error: err } = await supabase
        .from("daily_capacity")
        .select("*")
        .in("date", dateStrs);
      if (err) throw err;
      const map = {};
      dateStrs.forEach((d) => {
        const row = data?.find((r) => r.date === d);
        map[d] = row ?? { date: d, flights_total: 0, flights_remaining: 0, drives_total: 0, drives_remaining: 0, notes: "", is_full: false };
      });
      setCapacityData(map);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCapacity(); }, []);

  async function saveDay(dateStr) {
    const row = capacityData[dateStr];
    if (!row) return;
    setSaving(dateStr);
    try {
      const flightsTotal = Number(row.flights_total) || 0;
      const drivesTotal = Number(row.drives_total) || 0;
      const flightsRemaining = Math.min(Math.max(Number(row.flights_remaining) || 0, 0), flightsTotal);
      const drivesRemaining = Math.min(Math.max(Number(row.drives_remaining) || 0, 0), drivesTotal);
      const isReopening = flightsRemaining > 0 || drivesRemaining > 0;

      const { error: err } = await supabase
        .from("daily_capacity")
        .upsert({
          date: dateStr,
          flights_total: flightsTotal,
          flights_remaining: flightsRemaining,
          drives_total: drivesTotal,
          drives_remaining: drivesRemaining,
          notes: row.notes || null,
          updated_at: new Date().toISOString(),
          ...(isReopening ? { full_notification_sent_at: null } : {}),
        }, { onConflict: "date" });
      if (err) throw err;
      await loadCapacity();
    } catch {
      // silent fail, data reloads
    } finally {
      setSaving(null);
    }
  }

  function updateField(dateStr, field, value) {
    setCapacityData((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], [field]: value },
    }));
  }

  function getDayStatus(row) {
    if (!row || (row.flights_total === 0 && row.drives_total === 0)) return "empty";
    if (row.is_full) return "full";
    if (row.flights_remaining === 0 || row.drives_remaining === 0) return "partial";
    return "open";
  }

  const statusColors = { open: "var(--success)", partial: "var(--accent)", full: "var(--danger)", empty: "var(--muted)" };
  const statusLabels = { open: "OPEN", partial: "FILLING", full: "FULL", empty: "—" };

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading capacity...</div>;
  if (error) return (
    <div style={{ color: "var(--muted)", padding: 24 }}>
      Failed to load capacity.{" "}
      <button className="btn btn-ghost" style={{ padding: "4px 12px", fontSize: 11 }} onClick={loadCapacity}>Retry</button>
    </div>
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
        Capacity Calendar — Next 7 Days
      </div>
      {!isAdmin && (
        <div style={{ background: "rgba(232,180,74,0.08)", border: "1px solid rgba(232,180,74,0.25)", borderRadius: "var(--radius-sm)", padding: "10px 16px", marginBottom: 16, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--accent)", textAlign: "center", textTransform: "uppercase" }}>
          Read Only — Contact admin to update capacity
        </div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {week.map((date) => {
          const dateStr = toDateStr(date);
          const row = capacityData[dateStr];
          const status = getDayStatus(row);
          const today = isTodayCheck(date);
          const isSaving = saving === dateStr;

          return (
            <div key={dateStr} style={{
              background: "var(--surface)",
              border: `1px solid ${today ? "rgba(232,180,74,0.3)" : "var(--border)"}`,
              borderLeft: `3px solid ${status === "full" ? "var(--danger)" : today ? "var(--accent)" : "var(--accent2)"}`,
              borderRadius: "var(--radius-md)",
              padding: "18px 22px",
              opacity: status === "full" ? 0.85 : 1,
              transition: "border-color 0.2s",
            }}>
              {/* Day header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: today ? "var(--text)" : "var(--muted)", textTransform: "uppercase" }}>
                    {toDisplayLabel(date).toUpperCase()}
                  </span>
                  {today && (
                    <span style={{ fontSize: 9, fontWeight: 900, color: "var(--accent)", background: "rgba(232,180,74,0.12)", padding: "2px 8px", borderRadius: 4, letterSpacing: 1 }}>TODAY</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColors[status] }} />
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: statusColors[status] }}>{statusLabels[status]}</span>
                </div>
              </div>

              {/* Slots */}
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                {/* Flights */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>✈</div>
                  {isAdmin ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <input
                        type="number"
                        style={{ width: 48, height: 40, textAlign: "center", fontSize: 20, fontWeight: 800, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", outline: "none" }}
                        value={row?.flights_total ?? 0}
                        onChange={(e) => updateField(dateStr, "flights_total", e.target.value)}
                        onBlur={() => saveDay(dateStr)}
                      />
                      <span style={{ fontSize: 18, color: "var(--muted)", fontWeight: 300 }}>/</span>
                      <input
                        type="number"
                        style={{ width: 48, height: 40, textAlign: "center", fontSize: 20, fontWeight: 800, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--accent)", outline: "none" }}
                        value={row?.flights_remaining ?? 0}
                        onChange={(e) => updateField(dateStr, "flights_remaining", e.target.value)}
                        onBlur={() => saveDay(dateStr)}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                      {row?.flights_remaining ?? 0} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>of</span> {row?.flights_total ?? 0}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 1, fontWeight: 700, marginTop: 4 }}>
                    {isAdmin ? "TOTAL / LEFT" : "REMAINING"}
                  </div>
                </div>

                <div style={{ width: 1, height: 48, background: "var(--border)" }} />

                {/* Drives */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>🚗</div>
                  {isAdmin ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <input
                        type="number"
                        style={{ width: 48, height: 40, textAlign: "center", fontSize: 20, fontWeight: 800, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", outline: "none" }}
                        value={row?.drives_total ?? 0}
                        onChange={(e) => updateField(dateStr, "drives_total", e.target.value)}
                        onBlur={() => saveDay(dateStr)}
                      />
                      <span style={{ fontSize: 18, color: "var(--muted)", fontWeight: 300 }}>/</span>
                      <input
                        type="number"
                        style={{ width: 48, height: 40, textAlign: "center", fontSize: 20, fontWeight: 800, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--accent)", outline: "none" }}
                        value={row?.drives_remaining ?? 0}
                        onChange={(e) => updateField(dateStr, "drives_remaining", e.target.value)}
                        onBlur={() => saveDay(dateStr)}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                      {row?.drives_remaining ?? 0} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>of</span> {row?.drives_total ?? 0}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 1, fontWeight: 700, marginTop: 4 }}>
                    {isAdmin ? "TOTAL / LEFT" : "REMAINING"}
                  </div>
                </div>
              </div>

              {/* Saving indicator */}
              {isSaving && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Saving...</div>
              )}

              {/* Full banner */}
              {status === "full" && (
                <div style={{ background: "rgba(232,90,74,0.1)", borderRadius: 4, padding: "6px 12px", marginTop: 10, textAlign: "center" }}>
                  <span style={{ color: "var(--danger)", fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>DAY FULL</span>
                </div>
              )}

              {/* Notes */}
              {isAdmin ? (
                <input
                  type="text"
                  placeholder="Notes (optional)..."
                  style={{ width: "100%", marginTop: 12, padding: "8px 12px", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", outline: "none" }}
                  value={row?.notes ?? ""}
                  onChange={(e) => updateField(dateStr, "notes", e.target.value)}
                  onBlur={() => saveDay(dateStr)}
                />
              ) : row?.notes ? (
                <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", marginTop: 10 }}>{row.notes}</div>
              ) : null}
            </div>
          );
        })}
      </div>
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
                              {(() => {
                                const t = rec[`${d}_done_by`];
                                if (!t) return '';
                                const [h, m] = t.split(':').map(Number);
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                              })()}
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
// ─── AI CHAT ─────────────────────────────────────────────────────────────────
function AIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await fetch(
        "https://yincjogkjvotupzgetqg.supabase.co/functions/v1/ai-chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
          },
          body: JSON.stringify({ message: msg, history }),
        }
      );
      const data = await res.json();
      const reply = data.reply || data.error || "No response";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      // Update history for multi-turn conversation
      setHistory((prev) => [
        ...prev,
        { role: "user", content: msg },
        { role: "assistant", content: reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Error: " + e.message },
      ]);
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(245,166,35,0.4)",
          zIndex: 9999,
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span style={{ fontSize: 24, color: "#0a0c10" }}>AI</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 420,
        maxHeight: "70vh",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg)",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "var(--font-head)",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 1,
              color: "var(--accent)",
            }}
          >
            DRIVERPAY AI
          </span>
          <span
            style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}
          >
            Ask anything
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setMessages([]);
              setHistory([]);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 11,
              padding: "4px 8px",
            }}
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 200,
          maxHeight: "50vh",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              marginTop: 40,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>AI</div>
            <div>Ask about drivers, flights, trips, or costs</div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {[
                "Where are my drivers?",
                "How many trips this week?",
                "What flights are in the air?",
                "Give me a weekly summary",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 12px",
                    color: "var(--text)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}
          >
            <div
              style={{
                background:
                  m.role === "user"
                    ? "var(--accent)"
                    : "var(--bg)",
                color: m.role === "user" ? "#0a0c10" : "var(--text)",
                padding: "10px 14px",
                borderRadius:
                  m.role === "user"
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                border:
                  m.role === "assistant"
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "10px 14px",
              borderRadius: "14px 14px 14px 4px",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
          background: "var(--bg)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about drivers, flights, trips..."
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
          }}
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "10px 16px",
            color: "#0a0c10",
            fontWeight: 800,
            fontSize: 12,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
            letterSpacing: 1,
          }}
        >
          {loading ? "..." : "ASK"}
        </button>
      </div>
    </div>
  );
}

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
      // callers load all data like admins
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

  // Refresh data when switching tabs
  const refreshData = async () => {
    if (!user) return;
    const [{ data: profiles }, { data: entryData }, { data: tripData }] = await Promise.all([
      supabase.from("profiles").select("*"),
      user.role === "driver"
        ? supabase.from("entries").select("*").eq("driver_id", user.id).order("date", { ascending: false })
        : supabase.from("entries").select("*").order("date", { ascending: false }),
      user.role === "driver"
        ? supabase.from("trips").select("*").or(`driver_id.eq.${user.id},second_driver_id.eq.${user.id}`).order("scheduled_pickup", { ascending: false })
        : supabase.from("trips").select("*").order("scheduled_pickup", { ascending: false }),
    ]);
    if (profiles) setAllProfiles(profiles);
    if (entryData) setEntries(entryData);
    if (tripData) setTrips(tripData);
  };

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
  const showAdminDashboard = ["admin", "manager", "caller"].includes(user?.role);

  return (
    <div className="app">
      <style>{css}</style>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <>
          <Topbar user={user} onLogout={handleLogout} />
          {showAdminDashboard && <NotificationWarningBanner profiles={allProfiles} />}
          {showAdminDashboard && <AIChat />}
          {!showAdminDashboard ? (
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
              user={user}
              allProfiles={allProfiles}
              setAllProfiles={setAllProfiles}
              entries={entries}
              setEntries={setEntries}
              trips={trips}
              setTrips={setTrips}
              prefillData={prefillData}
              onPrefillConsumed={() => setPrefillData(null)}
              onTabChange={refreshData}
            />
          )}
        </>
      )}
    </div>
  );
}
