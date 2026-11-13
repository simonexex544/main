import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Check,
  Trash2,
  ExternalLink,
  Download,
  Loader2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import { AddonItem, ModItem, ModpackProject } from '../../types/modpack';
import { addLog } from '../../services/logger';

interface ModrinthBrowserViewProps {
  mode: 'mod' | 'shader' | 'resourcepack' | 'datapack';
  activeProject: ModpackProject | null;
  onUpdateProject: (updated: ModpackProject) => void;
  onNotify: (msg: string) => void;
}

const MOD_CATEGORIES = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'optimization', label: 'Optymalizacja' },
  { id: 'technology', label: 'Technologia' },
  { id: 'magic', label: 'Magia' },
  { id: 'adventure', label: 'Przygoda' },
  { id: 'worldgen', label: 'Świat i Biomy' },
  { id: 'utility', label: 'Narzędzia / UI' },
  { id: 'library', label: 'Biblioteki' },
];

export const ModrinthBrowserView: React.FC<ModrinthBrowserViewProps> = ({
  mode,
  activeProject,
  onUpdateProject,
  onNotify,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'downloads' | 'relevance' | 'newest' | 'updated'>('downloads');
  const [filterByPackEnv, setFilterByPackEnv] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcVersion = activeProject?.mcVersion || '1.21.1';
  const loader = activeProject?.loader || 'fabric';

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: mode,
        query,
        index: sortBy,
        limit: '24',
      });
      if (category !== 'all' && mode === 'mod') {
        params.set('category', category);
      }
      if (filterByPackEnv && activeProject) {
        params.set('mcVersion', mcVersion);
        if (mode === 'mod') params.set('loader', loader);
      }

      const res = await fetch(`/api/modrinth/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.hits || []);
      setTotalHits(data.total_hits || 0);
    } catch (err: any) {
      setError(err?.message || 'Nie udało się pobrać wyników z Modrinth API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
  }, [mode, category, sortBy, filterByPackEnv, mcVersion, loader]);

  const isAlreadyAdded = (slug: string, projectId: string): boolean => {
    if (!activeProject) return false;
    if (mode === 'mod') {
      return activeProject.mods.some(
        (m) => m.id.toLowerCase() === slug.toLowerCase() || m.projectId === projectId
      );
    }
    const list =
      mode === 'shader'
        ? activeProject.shaders || []
        : mode === 'resourcepack'
          ? activeProject.resourcePacks || []
          : activeProject.datapacks || [];
    return list.some((a) => a.id.toLowerCase() === slug.toLowerCase() || a.projectId === projectId);
  };

  const handleAddItem = async (hit: any) => {
    if (!activeProject) {
      onNotify('Najpierw utwórz lub wybierz aktywny projekt modpacka.');
      return;
    }

    setBusySlug(hit.slug);
    try {
      if (mode === 'mod') {
        const newMod: ModItem = {
          id: hit.slug,
          projectId: hit.project_id,
          name: hit.title,
          category: 'gameplay',
          description: hit.description,
          author: hit.author,
          iconUrl: hit.icon_url,
          downloads: hit.downloads,
          enabled: true,
        };

        const res = await fetch('/api/resolve-dependencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mods: [...activeProject.mods, newMod],
            loader: activeProject.loader,
            mcVersion: activeProject.mcVersion,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const resolved = await res.json();

        if (resolved.unresolved?.some((u: any) => u.id === hit.slug)) {
          const reason = resolved.unresolved.find((u: any) => u.id === hit.slug)?.reason;
          onNotify(`Nie dodano ${hit.title}: ${reason}`);
          return;
        }

        onUpdateProject({
          ...activeProject,
          mods: resolved.mods,
          loaderVersion: resolved.loaderVersion || activeProject.loaderVersion,
        });

        if (resolved.addedLibraries?.length > 0) {
          const libNames = Array.from(
            new Set(resolved.addedLibraries.map((l: any) => l.name))
          ).join(', ');
          onNotify(`Dodano ${hit.title} + wymagane biblioteki: ${libNames}`);
          addLog('info', 'Mod Browser', `Dodano ${hit.title} oraz biblioteki: ${libNames}`);
        } else {
          onNotify(`Dodano ${hit.title} do paczki ${activeProject.name}`);
          addLog('info', 'Mod Browser', `Dodano mod ${hit.title} do "${activeProject.name}"`);
        }
      } else {
        const res = await fetch('/api/modrinth/resolve-addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slugOrId: hit.project_id || hit.slug,
            type: mode,
            mcVersion: activeProject.mcVersion,
            loader: activeProject.loader,
          }),
        });

        if (!res.ok) throw new Error('Brak kompatybilnej wersji dla tego projektu');
        const data = await res.json();
        const addon: AddonItem = { ...data.addon, author: hit.author || data.addon.author };

        if (mode === 'shader') {
          onUpdateProject({
            ...activeProject,
            shaders: [...(activeProject.shaders || []), addon],
          });
        } else if (mode === 'resourcepack') {
          onUpdateProject({
            ...activeProject,
            resourcePacks: [...(activeProject.resourcePacks || []), addon],
          });
        } else {
          onUpdateProject({
            ...activeProject,
            datapacks: [...(activeProject.datapacks || []), addon],
          });
        }
        onNotify(`Dodano ${addon.name} do paczki ${activeProject.name}`);
        addLog('info', mode, `Dodano ${addon.name} do "${activeProject.name}"`);
      }
    } catch (err: any) {
      onNotify(err?.message || 'Nie udało się dodać elementu.');
    } finally {
      setBusySlug(null);
    }
  };

  const handleRemoveItem = (slug: string) => {
    if (!activeProject) return;
    if (mode === 'mod') {
      onUpdateProject({
        ...activeProject,
        mods: activeProject.mods.filter((m) => m.id.toLowerCase() !== slug.toLowerCase()),
      });
    } else if (mode === 'shader') {
      onUpdateProject({
        ...activeProject,
        shaders: (activeProject.shaders || []).filter((s) => s.id.toLowerCase() !== slug.toLowerCase()),
      });
    } else if (mode === 'resourcepack') {
      onUpdateProject({
        ...activeProject,
        resourcePacks: (activeProject.resourcePacks || []).filter(
          (r) => r.id.toLowerCase() !== slug.toLowerCase()
        ),
      });
    } else {
      onUpdateProject({
        ...activeProject,
        datapacks: (activeProject.datapacks || []).filter(
          (d) => d.id.toLowerCase() !== slug.toLowerCase()
        ),
      });
    }
    onNotify(`Usunięto ${slug} z paczki.`);
  };

  // Shader loader check
  const hasShaderMod = activeProject?.mods.some((m) =>
    ['iris', 'oculus', 'optifine'].includes(m.id.toLowerCase())
  );

  const handleInstallShaderEngine = async () => {
    if (!activeProject) return;
    const engineSlug = activeProject.loader === 'forge' ? 'oculus' : 'iris';
    await handleAddItem({
      slug: engineSlug,
      project_id: engineSlug,
      title: engineSlug === 'iris' ? 'Iris Shaders' : 'Oculus',
      description: 'Silnik ładowania shaderów',
      author: 'IMS21',
    });
  };

  const titles = {
    mod: 'Przeglądarka Modów Modrinth',
    shader: 'Shadery (Iris / Oculus)',
    resourcepack: 'Resource Packi',
    datapack: 'Datapacki',
  };

  return (
    <div className="space-y-5">
      {/* Contextual Guidance Banners */}
      {mode === 'shader' && activeProject && !hasShaderMod && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Brak moda obsługującego shadery w aktywnej paczce:</strong>{' '}
              Aby shadery działały na {activeProject.loader.toUpperCase()}, wymagany jest mod{' '}
              {activeProject.loader === 'forge' ? 'Oculus' : 'Iris Shaders'}.
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallShaderEngine}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shrink-0"
          >
            Dodaj {activeProject.loader === 'forge' ? 'Oculus' : 'Iris Shaders'}
          </button>
        </div>
      )}

      {mode === 'datapack' && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-800 dark:text-sky-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Datapacki dodane tutaj są pakowane do katalogu <code className="font-mono">overrides/datapacks/</code> wewnątrz pliku <code className="font-mono">.mrpack</code> zgodnie z ograniczeniami specyfikacji Modrinth.
          </span>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{titles[mode]}</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {activeProject
                ? `Docelowa paczka: ${activeProject.name} (${loader.toUpperCase()} ${mcVersion})`
                : 'Wybierz lub utwórz modpack, aby dodawać elementy'}
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterByPackEnv}
              onChange={(e) => setFilterByPackEnv(e.target.checked)}
              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Filtruj pod {loader.toUpperCase()} {mcVersion}</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
              placeholder="Szukaj w bazie Modrinth..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {mode === 'mod' && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200"
            >
              {MOD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200"
          >
            <option value="downloads">Najpopularniejsze</option>
            <option value="relevance">Trafność</option>
            <option value="updated">Ostatnio aktualizowane</option>
            <option value="newest">Najnowsze</option>
          </select>

          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shrink-0"
          >
            {loading ? 'Szukam...' : 'Szukaj'}
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums">
          Znaleziono w Modrinth: {totalHits.toLocaleString('pl-PL')} wyników
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {loading && results.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-xs">Ładowanie katalogu Modrinth API...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((hit) => {
            const added = isAlreadyAdded(hit.slug, hit.project_id);
            const busy = busySlug === hit.slug;
            const previewImg = mode === 'shader' && hit.gallery?.[0] ? hit.gallery[0] : null;

            return (
              <div
                key={hit.project_id}
                className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {previewImg && (
                    <div className="h-32 w-full bg-zinc-950 overflow-hidden">
                      <img
                        src={previewImg}
                        alt={hit.title}
                        className="w-full h-full object-cover opacity-90"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="p-4 flex items-start gap-3">
                    {hit.icon_url ? (
                      <img
                        src={hit.icon_url}
                        alt=""
                        className="w-11 h-11 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-zinc-800"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5 text-slate-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {hit.title}
                        </h3>
                        <a
                          href={`https://modrinth.com/${mode}/${hit.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-emerald-500 shrink-0"
                          title="Zobacz na Modrinth"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {hit.description}
                      </p>

                      <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 flex items-center gap-2 pt-1 tabular-nums">
                        <span>{hit.author}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {Number(hit.downloads || 0).toLocaleString('pl-PL')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-950/60 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                    {hit.slug}
                  </span>

                  {added ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>W paczce</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(hit.slug)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        title="Usuń z paczki"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || !activeProject}
                      onClick={() => handleAddItem(hit)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:opacity-45"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{busy ? 'Dodawanie...' : 'Dodaj do paczki'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
