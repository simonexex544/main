import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  FolderOpen,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import { AppLogEntry, ModpackProject, NavSection } from '../../types/modpack';
import { AppLanguage, t } from '../../services/i18n';

interface HealthStatus {
  status: string;
  modrinth?: { ok: boolean; latencyMs: number; message: string };
  loaders?: Record<string, { ok: boolean; sampleVersion?: string }>;
  ai?: { configured: boolean; model: string };
}

interface HomeViewProps {
  projects: ModpackProject[];
  logs: AppLogEntry[];
  language: AppLanguage;
  onNavigate: (section: NavSection) => void;
  onOpenProject: (projectId: string) => void;
  onExportProject: (project: ModpackProject) => void;
  onCreateEmptyQuick: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  projects,
  logs,
  language,
  onNavigate,
  onOpenProject,
  onExportProject,
  onCreateEmptyQuick,
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const totalInstalledMods = projects.reduce((acc, p) => acc + p.mods.length, 0);
  const totalConfigs = projects.reduce((acc, p) => acc + p.configs.length, 0);
  const recentlyOpened = [...projects]
    .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
    .slice(0, 4);
  const recentlyCreated = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome & Primary CTA */}
      <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            CraftPack Studio · Modrinth .mrpack v1
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {language === 'en'
              ? 'Build verified Minecraft modpacks without dependency crashes.'
              : 'Twórz stabilne paczki modów Minecraft bez błędów zależności.'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            {language === 'en'
              ? 'Design packs with AI, resolve recursive Modrinth libraries, verify Fabric/Forge/NeoForge/Quilt versions live, generate questlines, and export validated .mrpack archives.'
              : 'Projektuj paczki z pomocą AI, automatycznie dobieraj wymagane biblioteki z Modrinth API, weryfikuj wersje Fabric, Forge, NeoForge i Quilt, generuj questy i eksportuj gotowe archiwa .mrpack.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t(language, 'create_new_modpack')}</span>
          </button>

          <button
            type="button"
            onClick={onCreateEmptyQuick}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'en' ? 'Empty Modpack' : 'Pusty modpack'}</span>
          </button>
        </div>
      </section>

      {/* Stats + Live Modrinth Service Status */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>{language === 'en' ? 'Created Modpacks' : 'Utworzone modpacki'}</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {projects.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
            {totalConfigs} plików konfiguracyjnych
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>{language === 'en' ? 'Installed Mods' : 'Zainstalowane mody'}</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {totalInstalledMods}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
            Łącznie we wszystkich projektach
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              {language === 'en' ? 'Modrinth & Loader Services Status' : 'Status usług Modrinth API i Loaderów'}
            </span>
            <button
              type="button"
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>Odśwież</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {health?.modrinth?.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : health ? (
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="truncate font-medium text-slate-700 dark:text-zinc-200">
                Modrinth {health?.modrinth?.latencyMs ? `${health.modrinth.latencyMs}ms` : ''}
              </span>
            </div>

            {(['fabric', 'neoforge', 'forge', 'quilt'] as const).map((ldr) => {
              const info = health?.loaders?.[ldr];
              return (
                <div key={ldr} className="flex items-center gap-1.5">
                  {info?.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate text-slate-600 dark:text-zinc-300 font-mono">
                    {ldr}: {info?.sampleVersion || '...'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recently Opened & Recently Created Modpacks */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Opened */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Recently Opened Projects' : 'Ostatnio otwierane projekty'}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('modpacks')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Wszystkie ({projects.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {recentlyOpened.map((pack) => (
              <div key={pack.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                    {pack.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums mt-0.5">
                    {pack.loader} · {pack.mcVersion} · {pack.mods.length} modów · v{pack.version}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(pack.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Otwórz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportProject(pack)}
                    className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    title="Eksportuj .mrpack"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Created + Recent Operations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Recently Created Modpacks' : 'Ostatnio utworzone modpacki'}
            </h3>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentlyCreated.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => onOpenProject(pack.id)}
                  className="text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950/70 dark:hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                    {pack.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1 tabular-nums">
                    {pack.loader.toUpperCase()} · {pack.mcVersion}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {language === 'en' ? 'Recent Operations' : 'Ostatnie operacje'}
              </h4>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="text-xs flex items-start gap-2 text-slate-600 dark:text-zinc-400">
                  <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500 shrink-0 tabular-nums">
                    {log.timestamp}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 shrink-0">
                    [{log.source}]
                  </span>
                  <span className="truncate">{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-xs text-slate-400 dark:text-zinc-500">
                  Brak zarejestrowanych operacji w tej sesji.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
