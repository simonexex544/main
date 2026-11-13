import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wrench,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { ValidationAutoFix, ValidationReport } from '../../types/modpack';

interface ValidatorPanelProps {
  report: ValidationReport | null;
  isValidating: boolean;
  onRunValidation: () => void;
  onApplyAutoFix: (fix: ValidationAutoFix) => void;
}

export const ValidatorPanel: React.FC<ValidatorPanelProps> = ({
  report,
  isValidating,
  onRunValidation,
  onApplyAutoFix,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Walidator Kompatybilności i Specyfikacji .mrpack
            </h3>
          </div>
          {report ? (
            <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
              Status:{' '}
              <span
                className={
                  report.overallStatus === 'ERROR'
                    ? 'text-rose-500 font-bold'
                    : report.overallStatus === 'WARNING'
                      ? 'text-amber-500 font-bold'
                      : 'text-emerald-500 font-bold'
                }
              >
                {report.overallStatus}
              </span>{' '}
              · {report.summary.passCount} PASS · {report.summary.warningCount} WARNING ·{' '}
              {report.summary.errorCount} ERROR · Loader: {report.loader.toUpperCase()} {report.loaderVersion}
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-zinc-400">
              Uruchom weryfikację online przed eksportem archiwum .mrpack.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRunValidation}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 transition-colors shrink-0 disabled:opacity-50"
        >
          {isValidating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{isValidating ? 'Sprawdzanie...' : 'Sprawdź paczkę'}</span>
        </button>
      </div>

      {/* Validation Check List */}
      {report && (
        <div className="space-y-2.5">
          {report.items.map((item) => {
            const isError = item.status === 'ERROR';
            const isWarn = item.status === 'WARNING';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  isError
                    ? 'border-rose-500/40'
                    : isWarn
                      ? 'border-amber-500/40'
                      : 'border-slate-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isError ? (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : isWarn ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-mono font-bold ${
                          isError ? 'text-rose-500' : isWarn ? 'text-amber-500' : 'text-emerald-500'
                        }`}
                      >
                        [{item.status}]
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">
                        {item.title}
                      </span>
                      {item.affectedModName && (
                        <span className="text-slate-500 dark:text-zinc-400 font-mono">
                          · {item.affectedModName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {item.message}
                    </p>
                    {item.proposedFix && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Sugestia naprawy: {item.proposedFix}
                      </p>
                    )}
                  </div>
                </div>

                {item.autoFix && (
                  <button
                    type="button"
                    onClick={() => onApplyAutoFix(item.autoFix!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shrink-0 self-start"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{item.autoFix.label}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
