import { useState, useEffect, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://yincjogkjvotupzgetqg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las",
);

const FLIGHT_MONITOR_URL = "https://driverflight.live";

const LEVEL_COLORS = {
  error: "#ff453a",
  warn: "#ff9f0a",
  info: "#0a84ff",
};

const SOURCE_COLORS = {
  mobile: "#f5a623",
  web: "#0a84ff",
  flight_monitor: "#34c759",
  edge_function: "#bf5af2",
};

function TimeAgo({ date }) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return <span>{hours}h ago</span>;
  const days = Math.floor(hours / 24);
  return <span>{days}d ago</span>;
}

export default function OpsHealth() {
  const [authed, setAuthed] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [flightStatus, setFlightStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const OPS_PASS = "Zaxscd0909";

  function handleLogin(e) {
    e.preventDefault();
    if (passphrase === OPS_PASS) {
      setAuthed(true);
      sessionStorage.setItem("ops_auth", "1");
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem("ops_auth") === "1") setAuthed(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const rangeHours = timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 720;
      const since = new Date(Date.now() - rangeHours * 3600000).toISOString();

      // Fetch logs
      let query = supabase
        .from("system_logs")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterSource !== "all") query = query.eq("source", filterSource);
      if (filterLevel !== "all") query = query.eq("level", filterLevel);

      const { data: logData } = await query;
      setLogs(logData || []);

      // Fetch stats
      const { data: allLogs } = await supabase
        .from("system_logs")
        .select("source, level")
        .gte("created_at", since);

      if (allLogs) {
        const errorCount = allLogs.filter((l) => l.level === "error").length;
        const warnCount = allLogs.filter((l) => l.level === "warn").length;
        const bySource = {};
        allLogs.forEach((l) => {
          bySource[l.source] = (bySource[l.source] || 0) + 1;
        });
        setStats({ total: allLogs.length, errors: errorCount, warnings: warnCount, bySource });
      }

      // Flight monitor health
      try {
        const res = await fetch(`${FLIGHT_MONITOR_URL}/api/status`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          setFlightStatus({ up: true, ...data });
        } else {
          setFlightStatus({ up: false });
        }
      } catch {
        setFlightStatus({ up: false });
      }
    } catch (e) {
      console.error("Ops fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [filterSource, filterLevel, timeRange]);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  useEffect(() => {
    if (!authed || !autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authed, autoRefresh, fetchData]);

  if (!authed) {
    return (
      <div style={styles.authPage}>
        <style>{css}</style>
        <form onSubmit={handleLogin} style={styles.authForm}>
          <div style={styles.authTitle}>OPS HEALTH</div>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Passphrase"
            style={styles.authInput}
            autoFocus
          />
          <button type="submit" style={styles.authBtn}>
            ACCESS
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{css}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>SYSTEM HEALTH</div>
          <div style={styles.headerSub}>DriverPay Ops Dashboard</div>
        </div>
        <div style={styles.headerRight}>
          <label style={styles.autoLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={fetchData} style={styles.refreshBtn} disabled={loading}>
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div style={styles.cardGrid}>
        {/* Errors */}
        <div style={{ ...styles.statusCard, borderColor: LEVEL_COLORS.error }}>
          <div style={styles.statusLabel}>ERRORS</div>
          <div style={{ ...styles.statusValue, color: LEVEL_COLORS.error }}>
            {stats?.errors ?? "—"}
          </div>
          <div style={styles.statusSub}>{timeRange} window</div>
        </div>

        {/* Warnings */}
        <div style={{ ...styles.statusCard, borderColor: LEVEL_COLORS.warn }}>
          <div style={styles.statusLabel}>WARNINGS</div>
          <div style={{ ...styles.statusValue, color: LEVEL_COLORS.warn }}>
            {stats?.warnings ?? "—"}
          </div>
          <div style={styles.statusSub}>{timeRange} window</div>
        </div>

        {/* Total Events */}
        <div style={{ ...styles.statusCard, borderColor: "#333" }}>
          <div style={styles.statusLabel}>TOTAL EVENTS</div>
          <div style={styles.statusValue}>{stats?.total ?? "—"}</div>
          <div style={styles.statusSub}>{timeRange} window</div>
        </div>

        {/* Flight Monitor */}
        <div
          style={{
            ...styles.statusCard,
            borderColor: flightStatus?.up ? "#34c759" : "#ff453a",
          }}
        >
          <div style={styles.statusLabel}>FLIGHT MONITOR</div>
          <div
            style={{
              ...styles.statusValue,
              color: flightStatus === null ? "#666" : flightStatus.up ? "#34c759" : "#ff453a",
            }}
          >
            {flightStatus === null ? "..." : flightStatus.up ? "ONLINE" : "DOWN"}
          </div>
          <div style={styles.statusSub}>Linode service</div>
        </div>
      </div>

      {/* Source Breakdown */}
      {stats?.bySource && Object.keys(stats.bySource).length > 0 && (
        <div style={styles.sourceRow}>
          {Object.entries(stats.bySource).map(([src, count]) => (
            <div key={src} style={styles.sourceChip}>
              <span style={{ ...styles.sourceDot, backgroundColor: SOURCE_COLORS[src] || "#666" }} />
              <span style={styles.sourceLabel}>{src.replace("_", " ")}</span>
              <span style={styles.sourceCount}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          {["1h", "24h", "7d", "30d"].map((r) => (
            <button
              key={r}
              style={timeRange === r ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setTimeRange(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          {["all", "error", "warn", "info"].map((l) => (
            <button
              key={l}
              style={filterLevel === l ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterLevel(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          {["all", "mobile", "web", "flight_monitor", "edge_function"].map((s) => (
            <button
              key={s}
              style={filterSource === s ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilterSource(s)}
            >
              {s === "all" ? "ALL" : s.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Log Stream */}
      <div style={styles.logSection}>
        <div style={styles.logHeader}>
          <span style={styles.logTitle}>EVENT LOG</span>
          <span style={styles.logCount}>{logs.length} events</span>
        </div>
        <div style={styles.logList}>
          {logs.length === 0 && (
            <div style={styles.logEmpty}>No events in this time range.</div>
          )}
          {logs.map((log) => (
            <div key={log.id} style={styles.logRow}>
              <div style={styles.logTop}>
                <span style={{ ...styles.logLevel, color: LEVEL_COLORS[log.level] || "#666" }}>
                  {log.level.toUpperCase()}
                </span>
                <span
                  style={{ ...styles.logSource, color: SOURCE_COLORS[log.source] || "#666" }}
                >
                  {log.source.replace("_", " ")}
                </span>
                <span style={styles.logEvent}>{log.event}</span>
                <span style={styles.logTime}>
                  <TimeAgo date={log.created_at} />
                </span>
              </div>
              {log.message && <div style={styles.logMessage}>{log.message}</div>}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <details style={styles.logMeta}>
                  <summary style={styles.logMetaSummary}>metadata</summary>
                  <pre style={styles.logMetaPre}>{JSON.stringify(log.metadata, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const css = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; }
`;

const styles = {
  // Auth
  authPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  authForm: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: 300,
  },
  authTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 3,
    color: "#666",
    textAlign: "center",
  },
  authInput: {
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  },
  authBtn: {
    background: "#f5a623",
    border: "none",
    borderRadius: 6,
    padding: "12px 16px",
    color: "#0a0a0a",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 2,
    cursor: "pointer",
  },

  // Page
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "40px 32px",
    maxWidth: 1200,
    margin: "0 auto",
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 2,
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  autoLabel: {
    fontSize: 12,
    color: "#666",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  refreshBtn: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "8px 16px",
    color: "#999",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: "pointer",
  },

  // Status cards
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 20,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    color: "#666",
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: 900,
    color: "#fff",
  },
  statusSub: {
    fontSize: 11,
    color: "#444",
    marginTop: 4,
  },

  // Source breakdown
  sourceRow: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  sourceChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 6,
    padding: "8px 14px",
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    display: "inline-block",
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sourceCount: {
    fontSize: 13,
    fontWeight: 800,
    color: "#fff",
  },

  // Filters
  filterBar: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    gap: 4,
  },
  filterBtn: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 6,
    padding: "6px 14px",
    color: "#666",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "rgba(245, 166, 35, 0.12)",
    border: "1px solid #f5a623",
    borderRadius: 6,
    padding: "6px 14px",
    color: "#f5a623",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    cursor: "pointer",
  },

  // Log stream
  logSection: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 10,
    overflow: "hidden",
  },
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1e1e1e",
  },
  logTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: "#666",
  },
  logCount: {
    fontSize: 11,
    color: "#444",
  },
  logList: {
    maxHeight: "60vh",
    overflowY: "auto",
  },
  logEmpty: {
    padding: 40,
    textAlign: "center",
    color: "#444",
    fontSize: 13,
  },
  logRow: {
    padding: "14px 20px",
    borderBottom: "1px solid #1a1a1a",
  },
  logTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logLevel: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.5,
    minWidth: 50,
  },
  logSource: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  logEvent: {
    fontSize: 13,
    fontWeight: 600,
    color: "#ccc",
    flex: 1,
  },
  logTime: {
    fontSize: 11,
    color: "#444",
    whiteSpace: "nowrap",
  },
  logMessage: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
    paddingLeft: 62,
  },
  logMeta: {
    marginTop: 6,
    paddingLeft: 62,
  },
  logMetaSummary: {
    fontSize: 10,
    color: "#555",
    cursor: "pointer",
    letterSpacing: 1,
  },
  logMetaPre: {
    fontSize: 11,
    color: "#777",
    background: "#0a0a0a",
    padding: 12,
    borderRadius: 6,
    marginTop: 6,
    overflow: "auto",
    maxHeight: 200,
  },
};
