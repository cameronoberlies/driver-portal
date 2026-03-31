const SUPABASE_URL = 'https://yincjogkjvotupzgetqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmNqb2dranZvdHVwemdldHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc2MTAsImV4cCI6MjA4ODQ5MzYxMH0._gxry5gqeBUFRz8la2IeHW8if1M1IdAHACMKUWy1las';

const SOURCE = 'web';
const LOG_QUEUE = [];
let flushing = false;

/**
 * Log a system event to the system_logs table.
 * @param {'info'|'warn'|'error'} level
 * @param {string} event
 * @param {string} [message]
 * @param {object} [metadata]
 */
export function logEvent(level, event, message, metadata) {
  LOG_QUEUE.push({
    source: SOURCE,
    level,
    event,
    message: message || null,
    metadata: metadata || {},
    created_at: new Date().toISOString(),
  });

  if (!flushing) flushQueue();
}

async function flushQueue() {
  if (LOG_QUEUE.length === 0) return;
  flushing = true;

  const batch = LOG_QUEUE.splice(0, LOG_QUEUE.length);

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/system_logs`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
    });
  } catch (e) {
    console.log('[SystemLog] flush error:', e.message);
  } finally {
    flushing = false;
    if (LOG_QUEUE.length > 0) {
      setTimeout(flushQueue, 1000);
    }
  }
}
