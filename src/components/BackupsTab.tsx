import React, { useState } from 'react';
import { ShieldCheck, RotateCcw, Download, Trash2, Eye, Plus, Clock, FileCode } from 'lucide-react';
import { ConfigBackup, ConfigFile } from '../types/modpack';
import { exportBackupsAsJson, deleteBackup } from '../utils/backupStorage';

interface BackupsTabProps {
  backups: ConfigBackup[];
  onRestoreBackup: (backup: ConfigBackup) => void;
  onCreateManualBackup: (title?: string) => void;
  onRefreshBackups: (updated: ConfigBackup[]) => void;
}

export const BackupsTab: React.FC<BackupsTabProps> = ({
  backups,
  onRestoreBackup,
  onCreateManualBackup,
  onRefreshBackups
}) => {
  const [inspectingBackup, setInspectingBackup] = useState<ConfigBackup | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const handleDelete = (id: string) => {
    const updated = deleteBackup(id);
    onRefreshBackups(updated);
    if (inspectingBackup?.id === id) setInspectingBackup(null);
  };

  const handleRestore = (backup: ConfigBackup) => {
    onRestoreBackup(backup);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Automatyczny System Kopii Zapasowych Konfiguracji</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aplikacja automatycznie zabezpiecza stan wszystkich plików konfiguracyjnych przy każdym uruchomieniu i przed każdą generacją AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportBackupsAsJson()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title="Eksportuj wszystkie migawki do pliku JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz archiwum</span>
          </button>

          <button
            onClick={() => onCreateManualBackup()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Utwórz kopię teraz</span>
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Zarejestrowane migawki bezpieczeństwa ({backups.length})
        </h4>

        {backups.map(bak => {
          let triggerLabel = 'Ręczna migawka';
          let triggerColor = 'text-slate-400 bg-slate-800 border-slate-700';

          if (bak.trigger === 'app_launch') {
            triggerLabel = 'Auto: Uruchomienie aplikacji';
            triggerColor = 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
          } else if (bak.trigger === 'pre_generation') {
            triggerLabel = 'Auto: Przed generacją AI';
            triggerColor = 'text-sky-300 bg-sky-500/10 border-sky-500/20';
          } else if (bak.trigger === 'restore') {
            triggerLabel = 'Przed przywróceniem';
            triggerColor = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
          }

          return (
            <div
              key={bak.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-white">{bak.title}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${triggerColor}`}>
                    {triggerLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{bak.timestamp}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{bak.configs.length} plików config</span>
                  <span aria-hidden="true">·</span>
                  <span>Paczka: {bak.packName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  onClick={() => {
                    setInspectingBackup(bak);
                    setSelectedFileIndex(0);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Podgląd</span>
                </button>

                <button
                  onClick={() => handleRestore(bak)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Przywróć</span>
                </button>

                <button
                  onClick={() => handleDelete(bak.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Usuń kopię"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {backups.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
            <p className="text-sm font-medium">Brak zapisanych kopii zapasowych.</p>
            <p className="text-xs text-slate-500 mt-1">Kopie tworzą się automatycznie przy uruchomieniu lub po kliknięciu "Utwórz kopię teraz".</p>
          </div>
        )}
      </div>

      {/* Modal: Inspect Backup Snapshot */}
      {inspectingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Podgląd migawki: {inspectingBackup.title}</h3>
                <p className="text-xs text-slate-400">Wykonana: {inspectingBackup.timestamp}</p>
              </div>
              <button
                onClick={() => setInspectingBackup(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Zamknij
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 flex-1 overflow-hidden">
              {/* File list */}
              <div className="space-y-1 overflow-y-auto max-h-[50vh] pr-1">
                {inspectingBackup.configs.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 truncate ${
                      selectedFileIndex === idx
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:bg-slate-950'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{f.path}</span>
                  </button>
                ))}
              </div>

              {/* Code preview */}
              <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300/90 overflow-y-auto max-h-[50vh] whitespace-pre">
                {inspectingBackup.configs[selectedFileIndex]?.content || 'Pusty plik'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Plik {selectedFileIndex + 1} z {inspectingBackup.configs.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectingBackup(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zamknij
                </button>
                <button
                  onClick={() => {
                    handleRestore(inspectingBackup);
                    setInspectingBackup(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Przywróć tę migawkę</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
