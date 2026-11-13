import React from 'react';
import {
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { DownloadTask } from '../../types/modpack';
import { downloadManager } from '../../services/downloadManager';

interface DownloadsViewProps {
  tasks: DownloadTask[];
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({ tasks }) => {
  const activeCount = tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'queued' || t.status === 'verifying'
  ).length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Centrum Pobierania i Eksportu
          </h2>
          <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-1 tabular-nums">
            Aktywne: {activeCount} · Ukończone: {completedCount} · Błędy: {failedCount}
          </div>
        </div>

        <button
          type="button"
          onClick={() => downloadManager.clearCompleted()}
          disabled={completedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Wyczyść ukończone</span>
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center space-y-2">
          <Download className="w-7 h-7 text-slate-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
            Kolejka pobierania jest pusta
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Gdy wyeksportujesz plik .mrpack lub pobierzesz paczki zasobów, zobaczysz tutaj postęp, rozmiar i weryfikację SHA.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
          {tasks.map((task) => (
            <div key={task.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : task.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : task.status === 'queued' ? (
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                  )}

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {task.fileName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                      {task.itemType.toUpperCase()} · {formatBytes(task.totalBytes)} ·{' '}
                      {task.speedBytesPerSec > 0
                        ? `${formatBytes(task.speedBytesPerSec)}/s`
                        : task.status}
                      {task.sha1 ? ` · SHA1 ${task.sha1.slice(0, 8)}...` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 tabular-nums">
                    {task.progress}%
                  </span>
                  {task.status === 'failed' && task.url && (
                    <button
                      type="button"
                      onClick={() => downloadManager.retryTask(task.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Ponów</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    task.status === 'failed'
                      ? 'bg-rose-500'
                      : task.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-sky-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              {task.error && (
                <div className="text-xs text-rose-500 font-mono">{task.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
