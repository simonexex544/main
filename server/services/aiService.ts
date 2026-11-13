import { GoogleGenAI, Type } from '@google/genai';
import {
  AddonItem,
  ConfigFile,
  ModItem,
  ModLoader,
  ModpackCreationSettings,
  QuestLine,
} from '../../src/types/modpack';
import { resolveAddonItem, resolveModpackDependencies } from './dependencyResolver';
import { getLoaderVersions } from './loaderVersionService';
import { searchModrinthProjects } from './modrinthClient';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface AiDraftMod {
  slugOrSearch: string;
  name: string;
  category: string;
  reason: string;
  isCore?: boolean;
}

interface AiDraftResponse {
  name: string;
  summary: string;
  recommendedMemory: string;
  shaderAdvice: string;
  mods: AiDraftMod[];
  recommendedShaderSlug?: string;
  configs: ConfigFile[];
}

function buildSmartCuratedDraft(
  prompt: string,
  loader: ModLoader,
  mcVersion: string,
  settings: Partial<ModpackCreationSettings>
): AiDraftResponse {
  const lower = `${prompt} ${settings.gameplayType || ''}`.toLowerCase();
  const isForgeFamily = loader === 'forge' || loader === 'neoforge';
  const renderer = loader === 'forge' ? 'embeddium' : 'sodium';
  const shaderMod = loader === 'forge' ? 'oculus' : 'iris';

  const mods: AiDraftMod[] = [
    { slugOrSearch: renderer, name: renderer === 'sodium' ? 'Sodium' : 'Embeddium', category: 'optimization', reason: 'Wysoka wydajność renderowania FPS', isCore: true },
    { slugOrSearch: 'ferrite-core', name: 'FerriteCore', category: 'optimization', reason: 'Optymalizacja zużycia pamięci RAM', isCore: true },
    { slugOrSearch: 'immediatelyfast', name: 'ImmediatelyFast', category: 'optimization', reason: 'Płynne renderowanie GUI i HUD', isCore: true },
    { slugOrSearch: 'entityculling', name: 'Entity Culling', category: 'optimization', reason: 'Ukrywanie niewidocznych bytów dla wyższych FPS' },
    { slugOrSearch: 'jade', name: 'Jade', category: 'utility', reason: 'Podgląd informacji o blokach i stworzeniach' },
    { slugOrSearch: 'appleskin', name: 'AppleSkin', category: 'utility', reason: 'Wizualizacja nasycenia i głodu' },
    { slugOrSearch: 'jei', name: 'Just Enough Items (JEI)', category: 'utility', reason: 'Przeglądarka receptur craftingu' },
    { slugOrSearch: 'xaeros-minimap', name: "Xaero's Minimap", category: 'utility', reason: 'Przejrzysta minimapa świata' },
  ];

  if (!isForgeFamily) {
    mods.push({ slugOrSearch: 'lithium', name: 'Lithium', category: 'optimization', reason: 'Optymalizacja logiki serwera i fizyki' });
  } else {
    mods.push({ slugOrSearch: 'modernfix', name: 'ModernFix', category: 'optimization', reason: 'Szybsze ładowanie i mniejsze zużycie RAM' });
  }

  if (settings.includeShaders !== false || lower.includes('shader')) {
    mods.push({ slugOrSearch: shaderMod, name: shaderMod === 'iris' ? 'Iris Shaders' : 'Oculus', category: 'graphics', reason: 'Obsługa shaderów bez utraty wydajności' });
  }

  if (lower.includes('tech') || lower.includes('create') || lower.includes('przemysł') || lower.includes('fabryk')) {
    mods.push({ slugOrSearch: 'create', name: 'Create', category: 'technology', reason: 'Inżynieria kinetyczna i automatyzacja' });
    mods.push({ slugOrSearch: 'applied-energistics-2', name: 'Applied Energistics 2', category: 'technology', reason: 'Zaawansowane systemy magazynowania ME' });
  }

  if (lower.includes('rpg') || lower.includes('przygod') || lower.includes('dungeon') || lower.includes('loch') || lower.includes('magic')) {
    mods.push({ slugOrSearch: 'waystones', name: 'Waystones', category: 'adventure', reason: 'System teleportacji między odkrytymi punktami' });
    mods.push({ slugOrSearch: 'yungs-better-dungeons', name: "YUNG's Better Dungeons", category: 'worldgen', reason: 'Rozbudowane lochy i wyzwania' });
    mods.push({ slugOrSearch: 'yungs-better-mineshafts', name: "YUNG's Better Mineshafts", category: 'worldgen', reason: 'Klimatyczne kopalnie podziemne' });
    mods.push({ slugOrSearch: 'artifacts', name: 'Artifacts', category: 'adventure', reason: 'Unikalne relikty w skrzyniach' });
    if (lower.includes('magic') || lower.includes('mag')) {
      mods.push({ slugOrSearch: 'irons-spells-n-spellbooks', name: "Iron's Spells 'n Spellbooks", category: 'magic', reason: 'Księgi czarów i walka magiczna RPG' });
    }
  }

  if (lower.includes('survival') || lower.includes('vanilla') || lower.includes('budow') || lower.includes('roln') || mods.length < 11) {
    mods.push({ slugOrSearch: 'farmers-delight', name: "Farmer's Delight", category: 'gameplay', reason: 'Rozbudowane rolnictwo i gotowanie' });
    mods.push({ slugOrSearch: 'terralith', name: 'Terralith', category: 'worldgen', reason: 'Nowe malownicze biomy bez dodawania ciężkich bloków' });
    mods.push({ slugOrSearch: 'waystones', name: 'Waystones', category: 'gameplay', reason: 'Wygodne podróżowanie między bazami' });
  }

  if (settings.playMode === 'lan_friends' || lower.includes('znajom') || lower.includes('lan')) {
    mods.push({ slugOrSearch: 'e4mc', name: 'e4mc', category: 'utility', reason: 'Darmowa gra ze znajomymi przez udostępniony świat LAN' });
  }

  const targetRam = settings.targetRam || '6GB';
  const configs: ConfigFile[] = [
    {
      path: 'config/craftpack-tuning.json',
      content: JSON.stringify(
        {
          loader,
          mcVersion,
          performanceProfile: settings.performanceProfile || 'balanced',
          allocatedRam: targetRam,
          javaVersion: settings.javaVersion || '21',
          jvmArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC',
        },
        null,
        2
      ),
      description: 'Zoptymalizowany profil JVM i pamięci dla paczki',
    },
    {
      path: 'config/ferritecore.mixin.properties',
      content: 'memory.fast_blockstate_cache=true\nmemory.deduplicate_strings=true\nmemory.compact_fastutil=true\n',
      description: 'Kompresja struktur danych w pamięci RAM',
    },
  ];

  return {
    name: prompt ? `CraftPack: ${prompt.trim().slice(0, 28)}` : `CraftPack ${loader.toUpperCase()} ${mcVersion}`,
    summary: `Zweryfikowana paczka modów na ${loader.toUpperCase()} (${mcVersion}) dopasowana do stylu: ${settings.gameplayType || 'survival_plus'}.`,
    recommendedMemory: targetRam,
    shaderAdvice:
      settings.includeShaders !== false
        ? 'Rekomendowane shadery: Complementary Reimagined lub BSL Shaders na profilu Medium.'
        : 'Shadery wyłączone dla maksymalnej liczby klatek FPS.',
    mods,
    recommendedShaderSlug: settings.includeShaders !== false ? 'complementary-reimagined' : undefined,
    configs,
  };
}

export async function generateVerifiedModpackPlan(options: {
  prompt: string;
  loader: ModLoader;
  mcVersion: string;
  settings?: Partial<ModpackCreationSettings>;
}): Promise<{
  name: string;
  summary: string;
  loader: ModLoader;
  loaderVersion: string;
  mcVersion: string;
  recommendedMemory: string;
  shaderAdvice: string;
  mods: ModItem[];
  shaders: AddonItem[];
  configs: ConfigFile[];
  addedLibraries: Array<{ id: string; name: string; requiredBy: string }>;
  unresolvedSuggestions: Array<{ id: string; name: string; reason: string }>;
  usedAi: boolean;
}> {
  const { prompt, loader, mcVersion, settings = {} } = options;
  const ai = getAiClient();
  let draft: AiDraftResponse | null = null;
  let usedAi = false;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Zaprojektuj listę modów dla Minecraft ${mcVersion} na loaderze ${loader.toUpperCase()}.
Opis użytkownika: "${prompt || 'Zbalansowana paczka survival RPG z dobrą wydajnością'}"
Ustawienia: typ=${settings.gameplayType || 'survival_plus'}, trudność=${settings.difficulty || 'balanced'}, styl wizualny=${settings.visualStyle || 'enhanced'}, profil wydajności=${settings.performanceProfile || 'balanced'}, RAM=${settings.targetRam || '6GB'}, tryb=${settings.playMode || 'singleplayer'}, shadery=${settings.includeShaders !== false ? 'TAK' : 'NIE'}.
Zasady:
- Zwróć od 12 do 22 istniejących modów (podaj prawdziwe slugi Modrinth np. sodium, lithium, ferrite-core, create, farmers-delight, waystones, terralith, yungs-better-dungeons, jei).
- Nie mieszaj OptiFine z Sodium/Iris/Embeddium.
- Nie dubluj JEI/REI ani JourneyMap/Xaero's Minimap.
- Jeśli tryb to lan_friends, rozważ dodanie 'e4mc'.
- Przygotuj 2-3 realistyczne pliki konfiguracyjne do config/...`,
        config: {
          systemInstruction:
            'Jesteś doświadczonym architektem modpacków Minecraft. Zawsze zwracasz poprawny JSON zgodny ze schematem, w języku polskim.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              summary: { type: Type.STRING },
              recommendedMemory: { type: Type.STRING },
              shaderAdvice: { type: Type.STRING },
              recommendedShaderSlug: { type: Type.STRING },
              mods: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slugOrSearch: { type: Type.STRING },
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    isCore: { type: Type.BOOLEAN },
                  },
                  required: ['slugOrSearch', 'name', 'category', 'reason'],
                },
              },
              configs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    path: { type: Type.STRING },
                    content: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['path', 'content', 'description'],
                },
              },
            },
            required: ['name', 'summary', 'recommendedMemory', 'shaderAdvice', 'mods', 'configs'],
          },
        },
      });

      if (response.text) {
        draft = JSON.parse(response.text) as AiDraftResponse;
        usedAi = true;
      }
    } catch (err) {
      console.warn('AI plan generation failed, falling back to curated engine:', err);
    }
  }

  if (!draft || !Array.isArray(draft.mods) || draft.mods.length === 0) {
    draft = buildSmartCuratedDraft(prompt, loader, mcVersion, settings);
    usedAi = false;
  }

  // Convert AI suggestions into ModItem seeds and verify EVERY SINGLE ONE against live Modrinth API!
  const seedMods: ModItem[] = draft.mods.map((m) => ({
    id: (m.slugOrSearch || m.name).toLowerCase().trim(),
    name: m.name,
    category: (m.category as any) || 'gameplay',
    description: m.reason,
    reason: m.reason,
    isCore: Boolean(m.isCore),
    enabled: true,
  }));

  // Resolve recursively via live Modrinth API + real loader version
  const resolution = await resolveModpackDependencies({
    mods: seedMods,
    loader,
    mcVersion,
    includeCoreLoaderApi: true,
  });

  // Filter out any unresolved entries from primary mods list (and surface them cleanly!)
  const verifiedMods = resolution.mods.filter((m) => m.compatibilityStatus === 'compatible');

  // Optionally resolve shader addon if shaders requested
  const shaders: AddonItem[] = [];
  if (settings.includeShaders !== false) {
    const shaderSlug = draft.recommendedShaderSlug || 'complementary-reimagined';
    const resolvedShader = await resolveAddonItem(shaderSlug, 'shader', mcVersion, loader).catch(
      () => null
    );
    if (resolvedShader) {
      shaders.push(resolvedShader);
    }
  }

  const loaderInfo = await getLoaderVersions(loader, mcVersion);

  return {
    name: draft.name,
    summary: draft.summary,
    loader,
    loaderVersion: loaderInfo.recommended,
    mcVersion,
    recommendedMemory: draft.recommendedMemory || settings.targetRam || '6GB',
    shaderAdvice: draft.shaderAdvice || '',
    mods: verifiedMods,
    shaders,
    configs: draft.configs || [],
    addedLibraries: resolution.addedLibraries,
    unresolvedSuggestions: resolution.unresolved,
    usedAi,
  };
}

export async function generateQuestLineForPack(options: {
  modpackName: string;
  loader: ModLoader;
  mcVersion: string;
  installedMods: ModItem[];
  theme?: string;
  chaptersCount?: number;
}): Promise<QuestLine> {
  const { modpackName, loader, mcVersion, installedMods, theme = 'Progresywna przygoda i mistrzostwo rzemiosła', chaptersCount = 3 } = options;

  // Verify if ftb-quests exists on Modrinth for this loader & mcVersion
  let ftbQuestsCompatible = false;
  let ftbCompatibilityNote = '';
  try {
    const search = await searchModrinthProjects({
      query: 'FTB Quests',
      projectType: 'mod',
      loader,
      mcVersion,
      limit: 3,
    });
    const exact = search.hits.find((h) => h.slug.includes('ftb-quests'));
    if (exact) {
      ftbQuestsCompatible = true;
      ftbCompatibilityNote = `FTB Quests dostępne dla ${loader.toUpperCase()} ${mcVersion}. Eksport .snbt gotowy do overrides/config/ftbquests/.`;
    } else {
      ftbCompatibilityNote = `FTB Quests może wymagać instalacji ręcznej lub z CurseForge dla ${loader.toUpperCase()} ${mcVersion}. Pliki .snbt zostaną wyeksportowane poprawnie.`;
    }
  } catch {
    ftbCompatibilityNote = 'Wygenerowano strukturę zadań zgodną ze składnią FTB Quests SNBT.';
  }

  const allowedModIds = new Set(['minecraft', ...installedMods.map((m) => m.id.toLowerCase())]);
  const modSummary = installedMods
    .slice(0, 30)
    .map((m) => `- ${m.id}: ${m.name} (${m.category})`)
    .join('\n');

  const ai = getAiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Stwórz spójną linię zadań (Questline) dla modpacka "${modpackName}" (Minecraft ${mcVersion}, ${loader.toUpperCase()}).
Motyw przewodni: "${theme}"
Liczba rozdziałów: ${chaptersCount}

ZAINSTALOWANE MODY (WOLNO UŻYWAĆ WYŁĄCZNIE TYCH MODÓW ORAZ 'minecraft'):
${modSummary || '- minecraft: Vanilla Minecraft'}

ZASADY KRYTYCZNE:
1. Każdy quest, cel (objective) i nagroda (reward) MUSI odnosić się wyłącznie do zainstalowanych modów powyżej lub podstawowego 'minecraft'.
2. Jeśli na liście nie ma moda np. Create albo Botania, NIE WOLNO wspominać o nim ani używać jego przedmiotów!
3. Podaj w każdym rozdziale 3-4 questy główne i 1 zadanie poboczne (isSideQuest: true) z logiczną progresją (dependencies łączącymi ID questów w rozdziale).
4. Zwróć czytelny tekst po polsku oraz poprawne ID przedmiotów (np. minecraft:wooden_pickaxe, minecraft:iron_ingot lub z aktywnych modów).`,
        config: {
          systemInstruction:
            'Jesteś projektantem systemów progresji i questów w Minecraft (FTB Quests). Nigdy nie wymyślasz modów nieobecnych na liście wejściowej.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              storyPremise: { type: Type.STRING },
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    iconItem: { type: Type.STRING },
                    quests: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          isSideQuest: { type: Type.BOOLEAN },
                          iconItem: { type: Type.STRING },
                          modId: { type: Type.STRING },
                          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                          objectives: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING },
                                title: { type: Type.STRING },
                                target: { type: Type.STRING },
                                count: { type: Type.NUMBER },
                                modId: { type: Type.STRING },
                              },
                              required: ['id', 'type', 'title', 'target', 'count', 'modId'],
                            },
                          },
                          rewards: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING },
                                title: { type: Type.STRING },
                                item: { type: Type.STRING },
                                count: { type: Type.NUMBER },
                                xp: { type: Type.NUMBER },
                              },
                              required: ['id', 'type', 'title'],
                            },
                          },
                        },
                        required: [
                          'id',
                          'title',
                          'description',
                          'isSideQuest',
                          'iconItem',
                          'modId',
                          'dependencies',
                          'objectives',
                          'rewards',
                        ],
                      },
                    },
                  },
                  required: ['id', 'title', 'subtitle', 'iconItem', 'quests'],
                },
              },
            },
            required: ['title', 'storyPremise', 'chapters'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const sanitizedChapters = (parsed.chapters || []).map((ch: any, chIdx: number) => ({
          id: ch.id || `chapter_${chIdx + 1}`,
          title: ch.title,
          subtitle: ch.subtitle,
          iconItem: ch.iconItem || 'minecraft:book',
          order: chIdx,
          quests: (ch.quests || []).map((q: any, qIdx: number) => {
            const safeModId = allowedModIds.has((q.modId || '').toLowerCase())
              ? q.modId.toLowerCase()
              : 'minecraft';
            return {
              id: q.id || `q_${chIdx + 1}_${qIdx + 1}`,
              title: q.title,
              description: q.description,
              isSideQuest: Boolean(q.isSideQuest),
              iconItem: q.iconItem || 'minecraft:compass',
              modId: safeModId,
              dependencies: Array.isArray(q.dependencies) ? q.dependencies : [],
              objectives: (q.objectives || []).map((o: any, oIdx: number) => ({
                id: o.id || `obj_${oIdx}`,
                type: ['item', 'kill', 'dimension', 'advancement', 'checkmark'].includes(o.type)
                  ? o.type
                  : 'item',
                title: o.title,
                target: o.target || 'minecraft:oak_log',
                count: Number(o.count) || 1,
                modId: allowedModIds.has((o.modId || '').toLowerCase())
                  ? o.modId.toLowerCase()
                  : safeModId,
              })),
              rewards: (q.rewards || []).map((r: any, rIdx: number) => ({
                id: r.id || `rew_${rIdx}`,
                type: ['item', 'xp', 'loot'].includes(r.type) ? r.type : 'xp',
                title: r.title,
                item: r.item,
                count: r.count ? Number(r.count) : undefined,
                xp: r.xp ? Number(r.xp) : 50,
              })),
              x: qIdx * 3,
              y: q.isSideQuest ? 2 : 0,
            };
          }),
        }));

        return {
          id: `ql_${Date.now()}`,
          title: parsed.title || `Kroniki: ${modpackName}`,
          storyPremise: parsed.storyPremise || theme,
          generatedAt: new Date().toISOString(),
          ftbQuestsCompatible,
          ftbCompatibilityNote,
          chapters: sanitizedChapters,
        };
      }
    } catch (err) {
      console.warn('AI quest generation failed, using deterministic quest builder:', err);
    }
  }

  // Deterministic grounded fallback strictly using installedMods
  const chapters = [];
  chapters.push({
    id: 'ch_origins',
    title: 'Rozdział I: Pierwsze Kroki i Przetrwanie',
    subtitle: 'Fundamenty bazy i przygotowanie ekwipunku',
    iconItem: 'minecraft:oak_sapling',
    order: 0,
    quests: [
      {
        id: 'q_start_tools',
        title: 'Narzędzia Pioniera',
        description: 'Zbierz podstawowe surowce i stwórz kamienne narzędzia, aby bezpiecznie przetrwać pierwszą noc.',
        isSideQuest: false,
        iconItem: 'minecraft:stone_pickaxe',
        modId: 'minecraft',
        dependencies: [],
        objectives: [
          { id: 'o1', type: 'item' as const, title: 'Zdobądź bruk', target: 'minecraft:cobblestone', count: 16, modId: 'minecraft' },
        ],
        rewards: [{ id: 'r1', type: 'xp' as const, title: '50 XP', xp: 50 }],
        x: 0,
        y: 0,
      },
      {
        id: 'q_iron_age',
        title: 'Epoka Żelaza',
        description: 'Zejdź pod ziemię i przetop rudę żelaza na pełny zestaw zbroi oraz tarczę.',
        isSideQuest: false,
        iconItem: 'minecraft:iron_ingot',
        modId: 'minecraft',
        dependencies: ['q_start_tools'],
        objectives: [
          { id: 'o2', type: 'item' as const, title: 'Przetop sztabki żelaza', target: 'minecraft:iron_ingot', count: 24, modId: 'minecraft' },
        ],
        rewards: [
          { id: 'r2', type: 'item' as const, title: 'Złote Jabłko', item: 'minecraft:golden_apple', count: 1 },
        ],
        x: 3,
        y: 0,
      },
    ],
  });

  // Add chapter tailored to actual installed content mods
  const contentMods = installedMods.filter(
    (m) => !['optimization', 'library', 'utility'].includes(m.category)
  );
  if (contentMods.length > 0) {
    chapters.push({
      id: 'ch_modded_mastery',
      title: 'Rozdział II: Eksploracja Modyfikacji',
      subtitle: `Zadania dedykowane modom aktywnym w paczce (${contentMods.slice(0, 3).map((m) => m.name).join(', ')})`,
      iconItem: 'minecraft:compass',
      order: 1,
      quests: contentMods.slice(0, 4).map((m, idx) => ({
        id: `q_mod_${m.id.replace(/[^a-z0-9]/gi, '_')}`,
        title: `Odkryj: ${m.name}`,
        description: `Rozpocznij przygodę z modem ${m.name}: ${m.description}`,
        isSideQuest: idx === 3,
        iconItem: 'minecraft:enchanted_book',
        modId: m.id,
        dependencies: idx === 0 ? ['q_iron_age'] : [`q_mod_${contentMods[idx - 1].id.replace(/[^a-z0-9]/gi, '_')}`],
        objectives: [
          {
            id: `o_mod_${idx}`,
            type: 'checkmark' as const,
            title: `Oznacz ukończenie wprowadzenia do ${m.name}`,
            target: `${m.id}:milestone`,
            count: 1,
            modId: m.id,
          },
        ],
        rewards: [{ id: `r_mod_${idx}`, type: 'xp' as const, title: '150 XP', xp: 150 }],
        x: idx * 3,
        y: idx === 3 ? 2 : 0,
      })),
    });
  }

  return {
    id: `ql_${Date.now()}`,
    title: `Kroniki ${modpackName}`,
    storyPremise: theme,
    generatedAt: new Date().toISOString(),
    ftbQuestsCompatible,
    ftbCompatibilityNote,
    chapters,
  };
}
