import React, { useState } from 'react';
import { GitBranch, Plus, Tag, History, ArrowUpRight, Check, RotateCcw } from 'lucide-react';
import { ModpackData, ModpackVersion } from '../types/modpack';

interface VersionManagerTabProps {
  modpack: ModpackData;
  versions: ModpackVersion[];
  onCreateNewVersion: (versionNum: string, changelog: string[]) => void;
  onRestoreVersion: (version: ModpackVersion) => void;
}

export const VersionManagerTab: React.FC<VersionManagerTabProps> = ({
  modpack,
  versions,
  onCreateNewVersion,
  onRestoreVersion
}) => {
  const [isBumpingVersion, setIsBumpingVersion] = useState(false);
  const [newVersionNum, setNewVersionNum] = useState('');
  const [changelogInput, setChangelogInput] = useState('');

  // Propose next version
  const current = modpack.version || '1.0.0';
  const parts = current.split('.').map(n => parseInt(n, 10) || 0);
  const suggestedNext = `${parts[0]}.${(parts[1] || 0) + 1}.0`;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const ver = newVersionNum.trim() || suggestedNext;
    const notes = changelogInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    onCreateNewVersion(ver, notes.length > 0 ? notes : ['Aktualizacja konfiguracji i listy modyfikacji.']);
    setIsBumpingVersion(false);
    setNewVersionNum('');
    setChangelogInput('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">System Wersjonowania Paczki w Czasie Rzeczywistym</h3>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Obecna: v{modpack.version}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Twórz kolejne oficjalne wydania paczki z automatycznym dziennikiem zmian dla graczy i launcherów.
          </p>
        </div>

        <button
          onClick={() => {
            setNewVersionNum(suggestedNext);
            setIsBumpingVersion(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Wydaj nową wersję</span>
        </button>
      </div>

      {/* Current Version Changelog */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>Dziennik zmian aktywnej wersji (v{modpack.version}):</span>
        </div>

        <ul className="space-y-1.5 pl-2">
          {modpack.changelog.map((entry, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-emerald-400 font-bold shrink-0">·</span>
              <span>{entry}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Version History List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Historia wydań ({versions.length})
        </h4>

        {versions.map((ver, idx) => {
          const isCurrent = ver.versionNumber === modpack.version;

          return (
            <div
              key={ver.versionNumber + idx}
              className={`p-4 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold font-mono text-white">v{ver.versionNumber}</span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Aktywna
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                    <span>Wydano: {ver.releasedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ver.modsCount} modów</span>
                    <span aria-hidden="true">·</span>
                    <span>{ver.configsCount} plików config</span>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => onRestoreVersion(ver)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0 self-start sm:self-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Przełącz na tę wersję</span>
                  </button>
                )}
              </div>

              {ver.changelog.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-300">
                  {ver.changelog.map((log, lIdx) => (
                    <div key={lIdx} className="flex items-start gap-2">
                      <span className="text-slate-500">·</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Bump Version */}
      {isBumpingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100">
            <h3 className="text-sm font-bold text-white mb-1">Utwórz nową wersję paczki</h3>
            <p className="text-xs text-slate-400 mb-4">
              Zapisz obecny stan modów i konfiguracji jako oficjalną wersję .mrpack.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Numer wersji (semver)
                </label>
                <input
                  type="text"
                  value={newVersionNum}
                  onChange={(e) => setNewVersionNum(e.target.value)}
                  placeholder="np. 1.1.0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Co nowego w tej wersji? (jedna zmiana w linijce)
                </label>
                <textarea
                  rows={4}
                  value={changelogInput}
                  onChange={(e) => setChangelogInput(e.target.value)}
                  placeholder="np. Zaktualizowano Sodium do najnowszej wersji&#10;Poprawiono alokację RAM dla słabszych kart&#10;Dodano mod Waystones"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBumpingVersion(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                >
                  Zapisz wydanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
