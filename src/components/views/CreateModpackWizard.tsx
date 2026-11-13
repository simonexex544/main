import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  ExternalLink,
  Plus,
  CheckCircle2,
  PackageCheck,
  Search,
  Layers,
} from 'lucide-react';
import {
  AddonItem,
  ConfigFile,
  ModItem,
  ModLoader,
  ModpackCreationSettings,
  ModpackProject,
} from '../../types/modpack';
import { createEmptyModpack, createProjectFromData } from '../../services/projectStorage';
import { addLog } from '../../services/logger';

interface CreateModpackWizardProps {
  onProjectCreated: (project: ModpackProject, exportNow?: boolean) => void;
}

const MC_VERSIONS = ['1.21.4', '1.21.3', '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.1'];
const LOADERS: Array<{ id: ModLoader; label: string; desc: string }> = [
  { id: 'fabric', label: 'Fabric', desc: 'Lekki, szybki, świetny pod 1.20–1.21 i Sodium/Iris' },
  { id: 'neoforge', label: 'NeoForge', desc: 'Nowoczesny następca Forge dla 1.20.4–1.21+' },
  { id: 'forge', label: 'Forge', desc: 'Klasyczny ekosystem dla 1.20.1 i starszych paczek' },
  { id: 'quilt', label: 'Quilt', desc: 'Alternatywa dla Fabric z kompatybilnością QSL' },
];

const PROMPT_TEMPLATES = [
  'Nowoczesny survival+ na 1.21.1 z pięknymi biomami Terralith, lochami YUNG, gotowaniem i shaderami',
  'Paczka techniczno-fabryczna z modem Create, automatyzacją, AE2 i wysokim FPS',
  'Mroczne RPG z magią Iron’s Spells, reliktami Artifacts, waystone’ami i bossami do gry ze znajomymi',
  'Lekka paczka wydajnościowa 200+ FPS na słabszy laptop z minimapą i podglądem receptur',
];

export const CreateModpackWizard: React.FC<CreateModpackWizardProps> = ({
  onProjectCreated,
}) => {
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Stage 1: Prompt
  const [prompt, setPrompt] = useState(
    'Zbalansowany survival RPG z optymalizacją FPS, nowymi biomami, lochami i obsługą shaderów'
  );
  const [packName, setPackName] = useState('');

  // Stage 2: Full Configuration
  const [mcVersion, setMcVersion] = useState('1.21.1');
  const [loader, setLoader] = useState<ModLoader>('fabric');
  const [availableLoaderVersions, setAvailableLoaderVersions] = useState<string[]>([]);
  const [loaderVersion, setLoaderVersion] = useState('');
  const [loadingLoaderVersions, setLoadingLoaderVersions] = useState(false);

  const [settings, setSettings] = useState<ModpackCreationSettings>({
    javaVersion: '21',
    gameplayType: 'survival_plus',
    difficulty: 'balanced',
    visualStyle: 'cinematic_shaders',
    performanceProfile: 'balanced',
    targetRam: '6GB',
    playMode: 'singleplayer',
    includeShaders: true,
  });

  // Stage 3: Generated & Modrinth-verified results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [shaderAdvice, setShaderAdvice] = useState('');
  const [mods, setMods] = useState<ModItem[]>([]);
  const [shaders, setShaders] = useState<AddonItem[]>([]);
  const [configs, setConfigs] = useState<ConfigFile[]>([]);
  const [addedLibraries, setAddedLibraries] = useState<Array<{ id: string; name: string; requiredBy: string }>>([]);
  const [unresolvedSuggestions, setUnresolvedSuggestions] = useState<Array<{ id: string; name: string; reason: string }>>([]);
  const [expandedDepsId, setExpandedDepsId] = useState<string | null>(null);

  // Swap alternative / Add custom mod inline search
  const [swapTargetMod, setSwapTargetMod] = useState<ModItem | null>(null);
  const [modSearchQuery, setModSearchQuery] = useState('');
  const [modSearchResults, setModSearchResults] = useState<any[]>([]);
  const [isSearchingModrinth, setIsSearchingModrinth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchLoaders = async () => {
      setLoadingLoaderVersions(true);
      try {
        const res = await fetch(
          `/api/loaders/versions?loader=${encodeURIComponent(loader)}&mcVersion=${encodeURIComponent(mcVersion)}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setAvailableLoaderVersions(data.versions || []);
          setLoaderVersion(data.recommended || '');
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingLoaderVersions(false);
      }
    };
    fetchLoaders();
    return () => {
      cancelled = true;
    };
  }, [loader, mcVersion]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/ai/plan-modpack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          loader,
          mcVersion,
          settings,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setPackName(packName.trim() || data.name || `CraftPack ${loader} ${mcVersion}`);
      setSummary(data.summary || '');
      setShaderAdvice(data.shaderAdvice || '');
      setMods(data.mods || []);
      setShaders(data.shaders || []);
      setConfigs(data.configs || []);
      setAddedLibraries(data.addedLibraries || []);
      setUnresolvedSuggestions(data.unresolvedSuggestions || []);
      if (data.loaderVersion) setLoaderVersion(data.loaderVersion);
      setStage(3);
      addLog(
        'info',
        'AI Wizard',
        `Wygenerowano i zweryfikowano ${data.mods?.length || 0} modów dla ${loader.toUpperCase()} ${mcVersion}`
      );
    } catch (err: any) {
      setGenerationError(err?.message || 'Nie udało się wygenerować paczki.');
      addLog('error', 'AI Wizard', `Błąd generatora: ${err?.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateEmpty = () => {
    const empty = createEmptyModpack({
      name: packName.trim() || `Nowa Paczka ${loader.toUpperCase()} ${mcVersion}`,
      loader,
      mcVersion,
      loaderVersion,
    });
    addLog('info', 'Wizard', `Utworzono pusty modpack "${empty.name}"`);
    onProjectCreated(empty, false);
  };

  const handleToggleLock = (modId: string) => {
    setMods((prev) =>
      prev.map((m) => (m.id === modId ? { ...m, locked: !m.locked } : m))
    );
  };

  const handleRemoveMod = (modId: string) => {
    setMods((prev) => prev.filter((m) => m.id !== modId || m.locked));
  };

  const runModrinthQuickSearch = async (query: string) => {
    setIsSearchingModrinth(true);
    try {
      const res = await fetch(
        `/api/modrinth/search?type=mod&query=${encodeURIComponent(query)}&loader=${encodeURIComponent(loader)}&mcVersion=${encodeURIComponent(mcVersion)}&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        setModSearchResults(data.hits || []);
      }
    } finally {
      setIsSearchingModrinth(false);
    }
  };

  const handleAddOrSwapMod = async (hit: any) => {
    setIsSearchingModrinth(true);
    try {
      const baseList = swapTargetMod
        ? mods.filter((m) => m.id !== swapTargetMod.id)
        : mods;

      const candidate: ModItem = {
        id: hit.slug,
        projectId: hit.project_id,
        name: hit.title,
        category: 'gameplay',
        description: hit.description,
        iconUrl: hit.icon_url,
        downloads: hit.downloads,
        enabled: true,
      };

      const res = await fetch('/api/resolve-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: [...baseList, candidate],
          loader,
          mcVersion,
        }),
      });
      if (res.ok) {
        const resolved = await res.json();
        setMods(resolved.mods || baseList);
        if (resolved.addedLibraries?.length) {
          setAddedLibraries((prev) => [...prev, ...resolved.addedLibraries]);
        }
      }
    } finally {
      setSwapTargetMod(null);
      setModSearchResults([]);
      setModSearchQuery('');
      setIsSearchingModrinth(false);
    }
  };

  const handleFinalizeProject = (exportNow: boolean) => {
    const project = createProjectFromData({
      name: packName.trim() || `CraftPack ${loader.toUpperCase()} ${mcVersion}`,
      summary: summary || `Paczka dla ${loader.toUpperCase()} ${mcVersion}`,
      version: '1.0.0',
      author: 'CraftPack Studio',
      loader,
      loaderVersion,
      mcVersion,
      recommendedMemory: settings.targetRam,
      shaderAdvice,
      mods,
      shaders,
      configs,
      changelog: [`Utworzenie paczki w Kreatorze AI (${mods.length} zweryfikowanych modów)`],
      creationSettings: settings,
    });

    addLog('info', 'Wizard', `Zapisano nowy projekt: "${project.name}" (${mods.length} modów)`);
    onProjectCreated(project, exportNow);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step Progress Header */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs font-semibold">
          {[
            { step: 1 as const, label: '1. Opis i Styl' },
            { step: 2 as const, label: '2. Konfiguracja Techniczna' },
            { step: 3 as const, label: '3. Dobór Modów i Weryfikacja' },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                if (s.step < 3 || mods.length > 0) setStage(s.step);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                stage === s.step
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreateEmpty}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline"
        >
          Utwórz pusty modpack ({loader.toUpperCase()} {mcVersion})
        </button>
      </div>

      {/* STAGE 1: Prompt */}
      {stage === 1 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Opisz wymarzoną paczkę modów Minecraft
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              AI zaplanuje strukturę, a system zweryfikuje każdy mod oraz wymagane biblioteki bezpośrednio w Modrinth API.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Nazwa projektu (opcjonalnie)
              </label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                placeholder="np. Mroczne RPG ze Znajomymi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Opis stylu gry, klimatu i funkcji
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Np. Paczka na 1.21.1 NeoForge z modem Create, Farmer's Delight, pięknymi lochami, wysokim FPS i shaderami..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Prompt Inspiration */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Gotowe szablony pomysłów:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PROMPT_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(tpl)}
                    className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300 transition-colors"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {generationError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
              {generationError}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStage(2)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Ustawienia zaawansowane ({loader.toUpperCase()} · {mcVersion})</span>
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Weryfikacja w Modrinth...' : 'Generuj przez AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: Full Technical Configuration */}
      {stage === 2 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Konfiguracja środowiska Minecraft
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Wersja loadera jest pobierana na żywo z oficjalnych repozytoriów Fabric, NeoForge, Forge i Quilt.
            </p>
          </div>

          {/* Loader Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
              Mod Loader
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {LOADERS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLoader(l.id)}
                  className={`text-left p-3.5 rounded-xl border transition-colors ${
                    loader === l.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{l.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                    {l.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Technical Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Wersja Minecraft
              </label>
              <select
                value={mcVersion}
                onChange={(e) => setMcVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
              >
                {MC_VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Wersja Loadera {loadingLoaderVersions ? '(pobieranie...)' : ''}
              </label>
              <select
                value={loaderVersion}
                onChange={(e) => setLoaderVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
              >
                {availableLoaderVersions.length === 0 && (
                  <option value={loaderVersion}>{loaderVersion || 'Auto'}</option>
                )}
                {availableLoaderVersions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Docelowa wersja Java
              </label>
              <select
                value={settings.javaVersion}
                onChange={(e) => setSettings({ ...settings, javaVersion: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
              >
                <option value="21">Java 21 (Zalecana dla 1.20.5 – 1.21+)</option>
                <option value="17">Java 17 (Zalecana dla 1.20.1 – 1.20.4)</option>
                <option value="22">Java 22</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Typ rozgrywki
              </label>
              <select
                value={settings.gameplayType}
                onChange={(e) => setSettings({ ...settings, gameplayType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="survival_plus">Survival+ / Vanilla+</option>
                <option value="rpg">RPG i Przygoda</option>
                <option value="tech">Technologiczny / Create</option>
                <option value="magic">Magia i Bossowie</option>
                <option value="exploration">Eksploracja Świata</option>
                <option value="hardcore">Hardcore Survival</option>
                <option value="lightweight">Lekki / Max FPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Poziom trudności
              </label>
              <select
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="casual">Luźny (Casual)</option>
                <option value="balanced">Zbalansowany</option>
                <option value="hard">Trudny</option>
                <option value="expert">Ekspercki</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Styl wizualny
              </label>
              <select
                value={settings.visualStyle}
                onChange={(e) => setSettings({ ...settings, visualStyle: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="vanilla">Czysty Vanilla</option>
                <option value="enhanced">Ulepszony Vanilla (Animacje + Cząsteczki)</option>
                <option value="cinematic_shaders">Filmowe Shadery (Iris / Oculus)</option>
                <option value="atmospheric">Mroczny / Klimatyczny</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Profil wydajności
              </label>
              <select
                value={settings.performanceProfile}
                onChange={(e) => setSettings({ ...settings, performanceProfile: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="potato_max_fps">Maksimum FPS (Słabszy PC)</option>
                <option value="balanced">Zbalansowany</option>
                <option value="high_quality">Wysoka Jakość (Render Distance 16+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Docelowy RAM
              </label>
              <select
                value={settings.targetRam}
                onChange={(e) => setSettings({ ...settings, targetRam: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white"
              >
                <option value="4GB">4 GB</option>
                <option value="6GB">6 GB</option>
                <option value="8GB">8 GB</option>
                <option value="12GB">12 GB</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Tryb gry
              </label>
              <select
                value={settings.playMode}
                onChange={(e) => setSettings({ ...settings, playMode: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="singleplayer">Singleplayer</option>
                <option value="multiplayer_server">Serwer Dedykowany</option>
                <option value="lan_friends">Ze znajomymi (LAN / e4mc)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeShaders}
              onChange={(e) => setSettings({ ...settings, includeShaders: e.target.checked })}
              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Automatycznie skonfiguruj obsługę shaderów (Iris/Oculus + Complementary Shaders)</span>
          </label>

          {generationError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
              {generationError}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStage(1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Wróć do opisu</span>
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Analizuję zależności w Modrinth...' : 'Generuj zweryfikowaną paczkę'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: Verified Mod Selection */}
      {stage === 3 && (
        <div className="space-y-5">
          {/* Summary Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{packName}</h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400">{summary}</p>
              <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 tabular-nums pt-1">
                {loader.toUpperCase()} {loaderVersion} · MC {mcVersion} · {mods.length} zweryfikowanych modów · {shaders.length} shaderów · RAM {settings.targetRam}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleFinalizeProject(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white transition-colors"
              >
                Zapisz w Moje Paczki
              </button>
              <button
                type="button"
                onClick={() => handleFinalizeProject(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
              >
                <span>Zapisz i Eksportuj .mrpack</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto-added libraries notification */}
          {addedLibraries.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Automatycznie dołączono wymagane biblioteki z Modrinth API:</strong>{' '}
              {Array.from(new Set(addedLibraries.map((l) => `${l.name} (dla ${l.requiredBy})`))).join(', ')}.
            </div>
          )}

          {/* Unresolved AI suggestions notice */}
          {unresolvedSuggestions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
              <strong>Pominięto niekompatybilne sugestie ({unresolvedSuggestions.length}):</strong>{' '}
              {unresolvedSuggestions.map((u) => `${u.name} (${u.reason})`).join('; ')}.
            </div>
          )}

          {/* Add or Swap Mod Search Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                {swapTargetMod
                  ? `Wybierz zamiennik z Modrinth dla: ${swapTargetMod.name}`
                  : 'Dodaj dodatkowy mod z Modrinth API do tej paczki'}
              </div>
              {swapTargetMod && (
                <button
                  type="button"
                  onClick={() => {
                    setSwapTargetMod(null);
                    setModSearchResults([]);
                  }}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Anuluj zamianę
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modSearchQuery}
                  onChange={(e) => setModSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runModrinthQuickSearch(modSearchQuery);
                  }}
                  placeholder="Wpisz nazwę moda w Modrinth (np. Sophisticated Backpacks, FallingTree)..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => runModrinthQuickSearch(modSearchQuery)}
                disabled={isSearchingModrinth}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                {isSearchingModrinth ? 'Szukam...' : 'Szukaj w Modrinth'}
              </button>
            </div>

            {modSearchResults.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800 pt-1">
                {modSearchResults.map((hit) => (
                  <div key={hit.project_id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {hit.icon_url && (
                        <img src={hit.icon_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {hit.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {hit.description}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOrSwapMod(hit)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{swapTargetMod ? 'Zamień' : 'Dodaj'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verified Mod List */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
            {mods.map((mod) => {
              const showDeps = expandedDepsId === mod.id;
              return (
                <div key={mod.id} className="p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {mod.iconUrl ? (
                        <img
                          src={mod.iconUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-zinc-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {mod.name}
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {mod.modrinthUrl && (
                            <a
                              href={mod.modrinthUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-400 hover:text-emerald-500 inline-flex items-center gap-0.5"
                              title="Otwórz na Modrinth"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {mod.description}
                        </p>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1 tabular-nums">
                          {mod.version || 'latest'} · {(mod.loaders || [loader]).join('/')} · MC {mcVersion}
                          {mod.isAutoAdded ? ' · Auto-biblioteka' : ''}
                          {mod.fileSize ? ` · ${mod.fileSize}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedDepsId(showDeps ? null : mod.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                      >
                        Biblioteki ({mod.resolvedDependencies?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSwapTargetMod(mod);
                          setModSearchQuery(mod.category);
                          runModrinthQuickSearch(mod.category);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        title="Zamień na alternatywę"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleLock(mod.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          mod.locked
                            ? 'text-amber-500 bg-amber-500/10'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                        title={mod.locked ? 'Odblokuj mod' : 'Zablokuj przed usunięciem'}
                      >
                        {mod.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        disabled={mod.locked}
                        onClick={() => handleRemoveMod(mod.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                        title="Usuń mod"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {showDeps && (
                    <div className="pl-13 pt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                      {mod.resolvedDependencies && mod.resolvedDependencies.length > 0 ? (
                        mod.resolvedDependencies.map((d, idx) => (
                          <div key={idx} className="font-mono text-[11px]">
                            · [{d.dependencyType}] {d.name || d.slug || d.projectId}
                          </div>
                        ))
                      ) : (
                        <div>Ten mod nie zgłasza dodatkowych zależności w Modrinth.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
