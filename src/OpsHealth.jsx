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

function formatET(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  }) + " ET";
}

function TimeAgo({ date }) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const relative = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
  return <span>{formatET(date)} <span style={{ color: "#444", marginLeft: 6 }}>{relative}</span></span>;
}

export default function OpsHealth() {
  const [authed, setAuthed] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [logs, setLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [profileMap, setProfileMap] = useState({});
  const [stats, setStats] = useState(null);
  const [flightStatus, setFlightStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterAuditTable, setFilterAuditTable] = useState("all");
  const [filterAuditAction, setFilterAuditAction] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("activity");

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

      // Fetch profiles for name resolution
      const { data: profiles } = await supabase.from("profiles").select("id, name, role, device_os");
      if (profiles) {
        const map = {};
        profiles.forEach((p) => { map[p.id] = { name: p.name, os: p.device_os }; });
        setProfileMap(map);
      }

      // Fetch audit logs
      let auditQuery = supabase
        .from("audit_log")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterAuditTable !== "all") auditQuery = auditQuery.eq("table_name", filterAuditTable);
      if (filterAuditAction !== "all") auditQuery = auditQuery.eq("action", filterAuditAction);

      const { data: auditData } = await auditQuery;
      setAuditLogs(auditData || []);

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
  }, [filterSource, filterLevel, filterAuditTable, filterAuditAction, timeRange]);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  useEffect(() => {
    if (!authed || !autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authed, autoRefresh, fetchData]);

  const UUID_FIELDS = ["driver_id", "designated_driver_id", "second_driver_id", "changed_by", "id"];

  function displayValue(key, val) {
    if (val && UUID_FIELDS.includes(key) && profileMap[val]) {
      return `${profileMap[val].name}`;
    }
    return JSON.stringify(val);
  }

  function name(id) {
    return profileMap[id]?.name || "Unknown";
  }

  function osIcon(id) {
    const os = profileMap[id]?.os;
    if (os === "ios") return "[iOS]";
    if (os === "android") return "[AND]";
    return "";
  }

  function describeAudit(log) {
    const os = log.changed_by ? osIcon(log.changed_by) : "";
    const actorName = log.changed_by ? name(log.changed_by) : "System";
    const actor = os ? `${os} ${actorName}` : actorName;
    const n = log.new_data || {};
    const o = log.old_data || {};

    // ── TRIPS ──
    if (log.table_name === "trips") {
      const city = n.city || o.city || "unknown city";
      const driver = n.designated_driver_id ? name(n.designated_driver_id) : null;
      const tripType = (n.trip_type || o.trip_type) === "fly" ? "fly" : "drive";
      const typeIcon = tripType === "fly" ? "✈" : "🚗";

      if (log.action === "INSERT") {
        return {
          icon: "➕",
          text: `${actor} created a ${typeIcon} ${tripType} trip to ${city}${driver ? ` for ${driver}` : ""}`,
          color: "#34c759",
        };
      }

      if (log.action === "DELETE") {
        return {
          icon: "🗑",
          text: `${actor} deleted ${typeIcon} trip to ${city}`,
          color: "#ff453a",
        };
      }

      if (log.action === "UPDATE") {
        // Status changes
        if (o.status !== n.status) {
          if (n.status === "in_progress") {
            return {
              icon: "▶",
              text: `${actor} started ${typeIcon} trip to ${city}`,
              color: "#0a84ff",
            };
          }
          if (n.status === "completed") {
            const miles = n.miles ? `${n.miles} mi` : "";
            const hours = n.hours ? `${n.hours}h` : "";
            const detail = [miles, hours].filter(Boolean).join(", ");
            return {
              icon: "✓",
              text: `${actor} completed ${typeIcon} trip to ${city}${detail ? ` — ${detail}` : ""}`,
              color: "#34c759",
            };
          }
          if (n.status === "finalized") {
            return {
              icon: "✓✓",
              text: `${actor} finalized ${typeIcon} trip to ${city}`,
              color: "#f5a623",
            };
          }
        }

        // Driver reassignment
        if (o.designated_driver_id !== n.designated_driver_id && n.designated_driver_id) {
          const from = o.designated_driver_id ? name(o.designated_driver_id) : "unassigned";
          const to = name(n.designated_driver_id);
          return {
            icon: "🔄",
            text: `${actor} reassigned ${city} trip from ${from} to ${to}`,
            color: "#f5a623",
          };
        }

        // Generic trip update
        const changedFields = Object.keys(n).filter(k => JSON.stringify(n[k]) !== JSON.stringify(o[k]));
        const meaningful = changedFields.filter(k => !["updated_at", "created_at"].includes(k));
        return {
          icon: "✎",
          text: `${actor} updated ${city} trip — ${meaningful.join(", ")}`,
          color: "#999",
        };
      }
    }

    // ── ENTRIES ──
    if (log.table_name === "entries") {
      const city = n.city || o.city || "unknown city";
      const driverName = n.driver_id ? name(n.driver_id) : "unknown driver";
      const pay = n.pay ? `$${Number(n.pay).toFixed(2)}` : "";

      if (log.action === "INSERT") {
        return {
          icon: "📝",
          text: `${actor} logged entry for ${driverName} — ${city}${pay ? `, ${pay}` : ""}`,
          color: "#34c759",
        };
      }
      if (log.action === "UPDATE") {
        const changedFields = Object.keys(n).filter(k => JSON.stringify(n[k]) !== JSON.stringify(o[k]));
        const meaningful = changedFields.filter(k => !["updated_at", "created_at"].includes(k));
        return {
          icon: "✎",
          text: `${actor} edited entry for ${driverName} — ${city} (${meaningful.join(", ")})`,
          color: "#f5a623",
        };
      }
      if (log.action === "DELETE") {
        return {
          icon: "🗑",
          text: `${actor} deleted entry for ${driverName} — ${city}`,
          color: "#ff453a",
        };
      }
    }

    // ── PROFILES ──
    if (log.table_name === "profiles") {
      const target = n.name || o.name || "unknown user";

      if (log.action === "INSERT") {
        const role = n.role || "driver";
        return {
          icon: "👤",
          text: `${actor} created ${role} account for ${target}`,
          color: "#34c759",
        };
      }

      if (log.action === "UPDATE") {
        const changedFields = Object.keys(n).filter(k =>
          JSON.stringify(n[k]) !== JSON.stringify(o[k])
        ).filter(k => !["updated_at", "created_at", "push_token"].includes(k));

        if (changedFields.length === 0) {
          return {
            icon: "📱",
            text: `${target} synced push token`,
            color: "#444",
          };
        }
        if (changedFields.includes("role")) {
          return {
            icon: "🔑",
            text: `${actor} changed ${target}'s role from ${o.role} to ${n.role}`,
            color: "#f5a623",
          };
        }
        if (changedFields.includes("willing_to_fly")) {
          const status = n.willing_to_fly ? "willing to fly" : "not willing to fly";
          return {
            icon: "✈",
            text: `${actor} marked ${target} as ${status}`,
            color: "#0a84ff",
          };
        }
        if (changedFields.includes("can_drive_manual")) {
          const status = n.can_drive_manual ? "can drive manual" : "cannot drive manual";
          return {
            icon: "🚗",
            text: `${actor} marked ${target} as ${status}`,
            color: "#0a84ff",
          };
        }

        return {
          icon: "✎",
          text: `${actor} updated ${target}'s profile — ${changedFields.join(", ")}`,
          color: "#999",
        };
      }

      if (log.action === "DELETE") {
        return {
          icon: "🗑",
          text: `${actor} deleted ${target}'s account`,
          color: "#ff453a",
        };
      }
    }

    // ── FALLBACK ──
    return {
      icon: "•",
      text: `${actor} ${log.action.toLowerCase()}d ${log.table_name} #${log.record_id.slice(0, 8)}`,
      color: "#666",
    };
  }

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

      {/* Tab Switcher */}
      <div style={styles.tabRow}>
        <button
          style={activeTab === "activity" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("activity")}
        >
          ACTIVITY FEED
        </button>
        <button
          style={activeTab === "events" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("events")}
        >
          EVENT LOG
        </button>
        <button
          style={activeTab === "audit" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("audit")}
        >
          AUDIT LOG
        </button>
      </div>

      {/* Activity Feed */}
      {activeTab === "activity" && (
        <div style={styles.logSection}>
          <div style={styles.logHeader}>
            <span style={styles.logTitle}>ACTIVITY FEED</span>
            <span style={styles.logCount}>{auditLogs.length} actions</span>
          </div>
          <div style={styles.logList}>
            {auditLogs.length === 0 && (
              <div style={styles.logEmpty}>No activity in this time range.</div>
            )}
            {auditLogs.map((log) => {
              const desc = describeAudit(log);
              return (
                <div key={log.id} style={styles.activityRow}>
                  <span style={styles.activityIcon}>{desc.icon}</span>
                  <div style={styles.activityContent}>
                    <span style={{ ...styles.activityText, color: desc.color }}>{desc.text}</span>
                    <span style={styles.activityTime}>
                      <TimeAgo date={log.created_at} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Log */}
      {activeTab === "events" && (
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
      )}

      {/* Audit Log */}
      {activeTab === "audit" && (
        <>
          <div style={styles.filterBar}>
            <div style={styles.filterGroup}>
              {["all", "trips", "profiles", "entries"].map((t) => (
                <button
                  key={t}
                  style={filterAuditTable === t ? styles.filterBtnActive : styles.filterBtn}
                  onClick={() => setFilterAuditTable(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={styles.filterGroup}>
              {["all", "INSERT", "UPDATE", "DELETE"].map((a) => (
                <button
                  key={a}
                  style={filterAuditAction === a ? styles.filterBtnActive : styles.filterBtn}
                  onClick={() => setFilterAuditAction(a)}
                >
                  {a === "all" ? "ALL" : a}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.logSection}>
            <div style={styles.logHeader}>
              <span style={styles.logTitle}>AUDIT LOG</span>
              <span style={styles.logCount}>{auditLogs.length} changes</span>
            </div>
            <div style={styles.logList}>
              {auditLogs.length === 0 && (
                <div style={styles.logEmpty}>No audit events in this time range.</div>
              )}
              {auditLogs.map((log) => (
                <div key={log.id} style={styles.logRow}>
                  <div style={styles.logTop}>
                    <span style={{
                      ...styles.logLevel,
                      color: log.action === "DELETE" ? "#ff453a" : log.action === "INSERT" ? "#34c759" : "#f5a623",
                    }}>
                      {log.action}
                    </span>
                    <span style={{ ...styles.logSource, color: "#0a84ff" }}>
                      {log.table_name}
                    </span>
                    <span style={styles.logEvent}>#{log.record_id}</span>
                    {log.changed_by && (
                      <span style={{ ...styles.logSource, color: "#999" }}>
                        {osIcon(log.changed_by)} by {profileMap[log.changed_by]?.name || log.changed_by.slice(0, 8)}
                      </span>
                    )}
                    <span style={styles.logTime}>
                      <TimeAgo date={log.created_at} />
                    </span>
                  </div>
                  {log.action === "UPDATE" && log.old_data && log.new_data && (
                    <div style={styles.logMessage}>
                      {Object.keys(log.new_data).filter(k =>
                        JSON.stringify(log.new_data[k]) !== JSON.stringify(log.old_data[k])
                      ).map(k => (
                        <div key={k} style={{ marginBottom: 2 }}>
                          <span style={{ color: "#666" }}>{k}: </span>
                          <span style={{ color: "#ff453a", textDecoration: "line-through" }}>
                            {displayValue(k, log.old_data[k])}
                          </span>
                          <span style={{ color: "#666" }}> → </span>
                          <span style={{ color: "#34c759" }}>
                            {displayValue(k, log.new_data[k])}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {log.action === "INSERT" && log.new_data && (
                    <details style={styles.logMeta}>
                      <summary style={styles.logMetaSummary}>new record</summary>
                      <pre style={styles.logMetaPre}>{JSON.stringify(log.new_data, null, 2)}</pre>
                    </details>
                  )}
                  {log.action === "DELETE" && log.old_data && (
                    <details style={styles.logMeta}>
                      <summary style={styles.logMetaSummary}>deleted record</summary>
                      <pre style={styles.logMetaPre}>{JSON.stringify(log.old_data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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

  // Tabs
  tabRow: {
    display: "flex",
    gap: 4,
    marginBottom: 16,
  },
  tab: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "6px 6px 0 0",
    padding: "10px 24px",
    color: "#666",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: "pointer",
  },
  tabActive: {
    background: "#1a1a1a",
    border: "1px solid #1e1e1e",
    borderBottom: "2px solid #f5a623",
    borderRadius: "6px 6px 0 0",
    padding: "10px 24px",
    color: "#f5a623",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: "pointer",
  },

  // Activity feed
  activityRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: "14px 20px",
    borderBottom: "1px solid #1a1a1a",
  },
  activityIcon: {
    fontSize: 16,
    marginTop: 2,
    flexShrink: 0,
  },
  activityContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1,
    gap: 16,
  },
  activityText: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: "20px",
  },
  activityTime: {
    fontSize: 11,
    color: "#444",
    whiteSpace: "nowrap",
    flexShrink: 0,
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
