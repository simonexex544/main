import React, { useEffect, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { AppLogEntry, AppSettings, ModpackProject } from '../../types/modpack';
import { clearLogs, addLog } from '../../services/logger';
import { exportAllProjectsBackup, parseProjectsBackupJson } from '../../services/projectStorage';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  projects: ModpackProject[];
  onImportProjects: (imported: ModpackProject[]) => void;
  logs: AppLogEntry[];
  onNotify: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  projects,
  onImportProjects,
  logs,
  onNotify,
}) => {
  const [apiDiagnostics, setApiDiagnostics] = useState<any>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkDiagnostics = async () => {
    setCheckingApi(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) setApiDiagnostics(await res.json());
    } finally {
      setCheckingApi(false);
    }
  };

  useEffect(() => {
    checkDiagnostics();
  }, []);

  const handleClearCache = async () => {
    await fetch('/api/cache/clear', { method: 'POST' });
    addLog('info', 'Settings', 'Wyczyszczono pamięć podręczną Modrinth API');
    onNotify('Pamięć podręczna Modrinth i loaderów została wyczyszczona.');
  };

  const handleExportProjectsBackup = () => {
    const json = exportAllProjectsBackup(projects);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `craftpack-projects-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('info', 'Settings', `Wyeksportowano kopię zapasową ${projects.length} projektów`);
    onNotify('Pobrano kopię zapasową wszystkich projektów JSON.');
  };

  const handleImportProjectsBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseProjectsBackupJson(String(reader.result || ''));
        onImportProjects(imported);
        onNotify(`Zaimportowano ${imported.length} projektów z kopii zapasowej!`);
      } catch (err: any) {
        onNotify(err?.message || 'Nieprawidłowy plik kopii zapasowej.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Appearance & Language */}
      <section className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Wygląd i Język Interfejsu
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-2">
              Motyw aplikacji
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border ${
                  settings.theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Ciemny (Modrinth)</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border ${
                  settings.theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Jasny</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-2">
              Język interfejsu
            </label>
            <select
              value={settings.language}
              onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value as 'pl' | 'en' })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="pl">Polski (Domyślny)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>

      {/* Folders, Downloads & AI Profile */}
      <section className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Foldery, Pobieranie i Preferencje AI
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
              Domyślny folder projektów
            </label>
            <input
              type="text"
              value={settings.projectFolder}
              onChange={(e) => onUpdateSettings({ ...settings, projectFolder: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
              Domyślny folder eksportu .mrpack
            </label>
            <input
              type="text"
              value={settings.exportFolder}
              onChange={(e) => onUpdateSettings({ ...settings, exportFolder: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
              Maks. równoczesnych pobrań ({settings.downloadConcurrency})
            </label>
            <input
              type="range"
              min={1}
              max={8}
              value={settings.downloadConcurrency}
              onChange={(e) =>
                onUpdateSettings({ ...settings, downloadConcurrency: Number(e.target.value) })
              }
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
              Priorytet doboru AI
            </label>
            <select
              value={settings.aiTone}
              onChange={(e) => onUpdateSettings({ ...settings, aiTone: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="balanced">Zbalansowany (Wydajność + Zawartość)</option>
              <option value="performance">Maksymalna wydajność FPS</option>
              <option value="content_rich">Bogata zawartość i mechaniki</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 pt-1 text-xs text-slate-700 dark:text-zinc-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.verifySha}
              onChange={(e) => onUpdateSettings({ ...settings, verifySha: e.target.checked })}
              className="rounded text-emerald-500"
            />
            <span>Wymagaj weryfikacji sum SHA-1 / SHA-512 dla każdego pliku</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.preferReleaseVersions}
              onChange={(e) =>
                onUpdateSettings({ ...settings, preferReleaseVersions: e.target.checked })
              }
              className="rounded text-emerald-500"
            />
            <span>Preferuj stabilne wydania (Release) ponad Beta/Alpha</span>
          </label>
        </div>
      </section>

      {/* Server-side API & Integration Status (no API key input UI) */}
      <section className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Konfiguracja Usług API (Serwer)
          </h2>
          <button
            type="button"
            onClick={checkDiagnostics}
            disabled={checkingApi}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingApi ? 'animate-spin' : ''}`} />
            <span>Testuj połączenia</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-zinc-300">Modrinth API v2</span>
            <span className="inline-flex items-center gap-1 font-mono">
              {apiDiagnostics?.modrinth?.ok ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Online ({apiDiagnostics.modrinth.latencyMs}ms)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500">Sprawdzanie...</span>
                </>
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-zinc-300">Silnik AI (Serwer)</span>
            <span className="font-mono text-slate-500 dark:text-zinc-400">
              {apiDiagnostics?.ai?.configured
                ? `${apiDiagnostics.ai.model} (Aktywny)`
                : 'Tryb regułowy (Fallback)'}
            </span>
          </div>
        </div>
      </section>

      {/* Cache & Full Backup */}
      <section className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Kopia Zapasowa Projektów i Pamięć Podręczna
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Eksportuj wszystkie projekty do pliku JSON lub wyczyść cache zapytań Modrinth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleClearCache}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wyczyść Cache</span>
          </button>

          <button
            type="button"
            onClick={handleExportProjectsBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Przywróć JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportProjectsBackup}
          />
        </div>
      </section>

      {/* Application Logs */}
      <section className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Logi Aplikacji ({logs.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => clearLogs()}
            className="text-xs text-slate-500 hover:text-rose-500"
          >
            Wyczyść logi
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 text-zinc-300 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1">
          {logs.length === 0 && <div className="text-zinc-500">Brak zarejestrowanych zdarzeń.</div>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-2">
              <span className="text-zinc-500 shrink-0">{l.timestamp}</span>
              <span
                className={`uppercase shrink-0 ${
                  l.level === 'error'
                    ? 'text-rose-400'
                    : l.level === 'warn'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                [{l.level}]
              </span>
              <span className="text-sky-400 shrink-0">[{l.source}]</span>
              <span className="break-all">{l.message}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
