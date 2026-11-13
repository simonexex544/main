import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Layers,
  ShieldCheck,
  FileCode,
  Archive,
  GitBranch,
  Trash2,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  ExternalLink,
  Download,
  Share2,
} from 'lucide-react';
import {
  ConfigBackup,
  ConfigFile,
  ModLoader,
  ModpackProject,
  NavSection,
  ValidationAutoFix,
  ValidationReport,
} from '../../types/modpack';
import { ValidatorPanel } from './ValidatorPanel';
import { ConfigEditorTab } from '../ConfigEditorTab';
import { BackupsTab } from '../BackupsTab';
import { VersionManagerTab } from '../VersionManagerTab';

interface ProjectWorkspaceViewProps {
  project: ModpackProject;
  validationReport: ValidationReport | null;
  isValidating: boolean;
  backups: ConfigBackup[];
  onBackToList: () => void;
  onUpdateProject: (updated: ModpackProject) => void;
  onRunValidation: () => void;
  onApplyAutoFix: (fix: ValidationAutoFix) => void;
  onExportMrpack: () => void;
  onOpenShare: () => void;
  onNavigate: (section: NavSection) => void;
  onCreateManualBackup: (title?: string) => void;
  onRestoreBackup: (backup: ConfigBackup) => void;
  onRefreshBackups: (updated: ConfigBackup[]) => void;
  onCreateVersion: (versionNum: string, changelog: string[]) => void;
  onRestoreVersion: (ver: any) => void;
}

const MC_VERSIONS = ['1.21.4', '1.21.3', '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.1'];

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  project,
  validationReport,
  isValidating,
  backups,
  onBackToList,
  onUpdateProject,
  onRunValidation,
  onApplyAutoFix,
  onExportMrpack,
  onOpenShare,
  onNavigate,
  onCreateManualBackup,
  onRestoreBackup,
  onRefreshBackups,
  onCreateVersion,
  onRestoreVersion,
}) => {
  const [tab, setTab] = useState<'mods' | 'validator' | 'configs' | 'versions' | 'backups'>('mods');
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [isResolvingDeps, setIsResolvingDeps] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/loaders/versions?loader=${encodeURIComponent(project.loader)}&mcVersion=${encodeURIComponent(project.mcVersion)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !cancelled) {
          setLoaderVersions(data.versions || []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [project.loader, project.mcVersion]);

  const handleToggleMod = (modId: string) => {
    onUpdateProject({
      ...project,
      mods: project.mods.map((m) =>
        m.id === modId ? { ...m, enabled: m.enabled === false } : m
      ),
    });
  };

  const handleToggleLock = (modId: string) => {
    onUpdateProject({
      ...project,
      mods: project.mods.map((m) =>
        m.id === modId ? { ...m, locked: !m.locked } : m
      ),
    });
  };

  const handleRemoveMod = (modId: string) => {
    onUpdateProject({
      ...project,
      mods: project.mods.filter((m) => m.id !== modId || m.locked),
    });
  };

  const handleRemoveAddon = (type: 'shader' | 'resourcepack' | 'datapack', id: string) => {
    if (type === 'shader') {
      onUpdateProject({ ...project, shaders: (project.shaders || []).filter((s) => s.id !== id) });
    } else if (type === 'resourcepack') {
      onUpdateProject({
        ...project,
        resourcePacks: (project.resourcePacks || []).filter((r) => r.id !== id),
      });
    } else {
      onUpdateProject({ ...project, datapacks: (project.datapacks || []).filter((d) => d.id !== id) });
    }
  };

  const handleAutoResolveAll = async () => {
    setIsResolvingDeps(true);
    try {
      const res = await fetch('/api/resolve-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: project.mods,
          loader: project.loader,
          mcVersion: project.mcVersion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateProject({
          ...project,
          mods: data.mods || project.mods,
          loaderVersion: data.loaderVersion || project.loaderVersion,
        });
      }
    } finally {
      setIsResolvingDeps(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Workspace Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200"
              title="Wróć do listy paczek"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{project.name}</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{project.summary}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Udostępnij link</span>
            </button>

            <button
              type="button"
              onClick={onExportMrpack}
              disabled={validationReport?.overallStatus === 'ERROR'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:opacity-45"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Eksportuj .mrpack</span>
            </button>
          </div>
        </div>

        {/* Inline Target Environment Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              Mod Loader
            </label>
            <select
              value={project.loader}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  loader: e.target.value as ModLoader,
                  loaderVersion: undefined,
                })
              }
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
            >
              <option value="fabric">Fabric</option>
              <option value="neoforge">NeoForge</option>
              <option value="forge">Forge</option>
              <option value="quilt">Quilt</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              Wersja Minecraft
            </label>
            <select
              value={project.mcVersion}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  mcVersion: e.target.value,
                  loaderVersion: undefined,
                })
              }
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
            >
              {MC_VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              Wersja Loadera (live API)
            </label>
            <select
              value={project.loaderVersion || loaderVersions[0] || ''}
              onChange={(e) => onUpdateProject({ ...project, loaderVersion: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
            >
              {loaderVersions.length === 0 && (
                <option value={project.loaderVersion || ''}>
                  {project.loaderVersion || 'Auto'}
                </option>
              )}
              {loaderVersions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-zinc-800 pb-2">
        {[
          { id: 'mods' as const, label: `Mody i Dodatki (${project.mods.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
          {
            id: 'validator' as const,
            label: `Walidator (${validationReport?.overallStatus || '...'})`,
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
          },
          { id: 'configs' as const, label: `Konfiguracje (${project.configs.length})`, icon: <FileCode className="w-3.5 h-3.5" /> },
          { id: 'versions' as const, label: `Wersje (${project.versions.length})`, icon: <GitBranch className="w-3.5 h-3.5" /> },
          { id: 'backups' as const, label: `Kopie Zapasowe (${backups.length})`, icon: <Archive className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-emerald-500 text-zinc-950'
                : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'mods' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-zinc-400">
              Dodawaj mody z Przeglądarki Modów lub automatycznie uzupełnij wszystkie brakujące biblioteki z Modrinth API.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoResolveAll}
                disabled={isResolvingDeps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResolvingDeps ? 'animate-spin' : ''}`} />
                <span>{isResolvingDeps ? 'Rozwiązywanie...' : 'Uzupełnij biblioteki z Modrinth'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('mods')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj z Przeglądarki Modów</span>
              </button>
            </div>
          </div>

          {/* Mods List */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
            {project.mods.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                Ta paczka nie ma jeszcze żadnych modów. Przejdź do <strong>Przeglądarki Modów</strong>, aby dodać modyfikacje.
              </div>
            )}
            {project.mods.map((mod) => {
              const isEnabled = mod.enabled !== false;
              return (
                <div
                  key={mod.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !isEnabled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleMod(mod.id)}
                      className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 shrink-0"
                    />
                    {mod.iconUrl && (
                      <img src={mod.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {mod.name}
                        </span>
                        {mod.modrinthUrl && (
                          <a
                            href={mod.modrinthUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-emerald-500"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                        {mod.id} · {mod.version || 'do weryfikacji'}
                        {mod.isAutoAdded ? ' · Biblioteka wymagana' : ''}
                        {mod.fileSize ? ` · ${mod.fileSize}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleLock(mod.id)}
                      className={`p-1.5 rounded-lg ${
                        mod.locked
                          ? 'text-amber-500 bg-amber-500/10'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                      title={mod.locked ? 'Odblokuj' : 'Zablokuj'}
                    >
                      {mod.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={mod.locked}
                      onClick={() => handleRemoveMod(mod.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                      title="Usuń z paczki"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Addons Summary (Shaders / Resource Packs / Datapacks) */}
          {((project.shaders?.length || 0) > 0 ||
            (project.resourcePacks?.length || 0) > 0 ||
            (project.datapacks?.length || 0) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Shadery', type: 'shader' as const, items: project.shaders || [] },
                { title: 'Resource Packi', type: 'resourcepack' as const, items: project.resourcePacks || [] },
                { title: 'Datapacki', type: 'datapack' as const, items: project.datapacks || [] },
              ].map((grp) => (
                <div
                  key={grp.type}
                  className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {grp.title} ({grp.items.length})
                  </div>
                  {grp.items.length === 0 && (
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Brak dodanych.</div>
                  )}
                  {grp.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-slate-700 dark:text-zinc-300">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(grp.type, item.id)}
                        className="text-slate-400 hover:text-rose-500 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'validator' && (
        <ValidatorPanel
          report={validationReport}
          isValidating={isValidating}
          onRunValidation={onRunValidation}
          onApplyAutoFix={onApplyAutoFix}
        />
      )}

      {tab === 'configs' && (
        <ConfigEditorTab
          modpack={project}
          onUpdateConfigs={(newConfigs: ConfigFile[]) =>
            onUpdateProject({ ...project, configs: newConfigs })
          }
          onTakeBackup={(title: string) => onCreateManualBackup(title)}
        />
      )}

      {tab === 'versions' && (
        <VersionManagerTab
          modpack={project}
          versions={project.versions}
          onCreateNewVersion={onCreateVersion}
          onRestoreVersion={onRestoreVersion}
        />
      )}

      {tab === 'backups' && (
        <BackupsTab
          backups={backups}
          onRestoreBackup={onRestoreBackup}
          onCreateManualBackup={onCreateManualBackup}
          onRefreshBackups={onRefreshBackups}
        />
      )}
    </div>
  );
};
