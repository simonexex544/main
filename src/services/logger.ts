import { AppLogEntry } from '../types/modpack';

const LOGS_KEY = 'craftpack_studio_logs_v2';
const MAX_LOGS = 200;

type Listener = (logs: AppLogEntry[]) => void;
const listeners = new Set<Listener>();

export function getLogs(): AppLogEntry[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLog(
  level: AppLogEntry['level'],
  source: string,
  message: string
): AppLogEntry {
  const entry: AppLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    level,
    source,
    message,
  };

  try {
    const updated = [entry, ...getLogs()].slice(0, MAX_LOGS);
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
    listeners.forEach((fn) => fn(updated));
  } catch {
    // ignore storage quota
  }

  return entry;
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(LOGS_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn([]));
}

export function subscribeLogs(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
