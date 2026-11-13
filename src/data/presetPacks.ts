import { ModpackData, ModItem } from '../types/modpack';

export const POPULAR_AVAILABLE_MODS: ModItem[] = [
  // Optymalizacja & Grafika
  {
    id: 'sodium',
    name: 'Sodium',
    category: 'optimization',
    description: 'Najnowocześniejszy silnik renderujący, zwiększa klatki (FPS) o 200-400%',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    conflicts: ['optifine'],
    dependencies: ['fabric-api'],
    author: 'jellysquid3'
  },
  {
    id: 'iris',
    name: 'Iris Shaders',
    category: 'graphics',
    description: 'Pełna obsługa shaderów kompatybilna z Sodium, wydajniejsza od OptiFine',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    conflicts: ['optifine'],
    dependencies: ['sodium'],
    author: 'IMS21'
  },
  {
    id: 'lithium',
    name: 'Lithium',
    category: 'optimization',
    description: 'Optymalizacja fizyki gry, chunków oraz algorytmów mobów bez zmiany zachowania',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'jellysquid3'
  },
  {
    id: 'ferrite-core',
    name: 'FerriteCore',
    category: 'optimization',
    description: 'Kluczowa optymalizacja pamięci RAM Minecrafta redukująca zużycie nawet o połowę',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'malte0811'
  },
  {
    id: 'immediatelyfast',
    name: 'ImmediatelyFast',
    category: 'optimization',
    description: 'Ekspresowe renderowanie GUI, HUD, scoreboardów oraz map w ręku',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'Raphiiko'
  },
  {
    id: 'entityculling',
    name: 'Entity Culling',
    category: 'optimization',
    description: 'Pomija renderowanie mobów i kafelków, których nie widać na ekranie',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'tr7zw'
  },
  {
    id: 'modernfix',
    name: 'ModernFix',
    category: 'optimization',
    description: 'Drastycznie skraca czas uruchamiania gry i eliminuje wycieki pamięci Java',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'embeddedt'
  },

  // Biblioteki
  {
    id: 'fabric-api',
    name: 'Fabric API',
    category: 'library',
    description: 'Standardowe API i biblioteka haczyków wymagana przez mody Fabric',
    loaders: ['fabric'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    isCore: true,
    author: 'Modmuss50'
  },
  {
    id: 'cloth-config',
    name: 'Cloth Config v15',
    category: 'library',
    description: 'Niezbędny ekran konfiguracji modyfikacji w menu gry',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'shedaniel'
  },
  {
    id: 'architectury-api',
    name: 'Architectury API',
    category: 'library',
    description: 'Wieloplatformowa biblioteka ułatwiająca działanie modów na Fabric i NeoForge',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'shedaniel'
  },
  {
    id: 'yungs-api',
    name: "YUNG's API",
    category: 'library',
    description: "Kluczowa biblioteka bazowa wymagana przez mody YUNG's Better Mineshafts, Dungeons i Strongholds",
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    isCore: true,
    author: 'YUNGNICKYOUNG'
  },
  {
    id: 'player-animator',
    name: 'playerAnimator',
    category: 'library',
    description: 'Biblioteka animacji szkieletowych gracza dla czarów i unikalnych ruchów',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    isCore: true,
    author: 'KosmX'
  },
  {
    id: 'trinkets',
    name: 'Trinkets',
    category: 'library',
    description: 'Dodatkowe sloty w ekwipunku na naszyjniki, pierścienie i talizmany',
    loaders: ['fabric'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    isCore: true,
    author: 'emilyploszaj'
  },

  // Utility & Interface
  {
    id: 'jei',
    name: 'Just Enough Items (JEI)',
    category: 'utility',
    description: 'Intuicyjna wyszukiwarka receptur craftingu, pieców i alchemii z prawej strony ekwipunku',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    conflicts: ['rei'],
    dependencies: [],
    author: 'mezz'
  },
  {
    id: 'rei',
    name: 'Roughly Enough Items (REI)',
    category: 'utility',
    description: 'Nowoczesny, lekki odpowiednik JEI stworzony specjalnie dla środowiska Fabric',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    conflicts: ['jei'],
    dependencies: ['cloth-config', 'architectury-api'],
    author: 'shedaniel'
  },
  {
    id: 'jade',
    name: 'Jade',
    category: 'utility',
    description: 'Czytelny dymek informacyjny na górze ekranu o bloku, skrzyni lub stworzeniu',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'Snownee'
  },
  {
    id: 'appleskin',
    name: 'AppleSkin',
    category: 'utility',
    description: 'Podgląd wartości odżywczych jedzenia, nasycenia i szacowanego leczenia',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'squeek502'
  },
  {
    id: 'journeymap',
    name: 'JourneyMap',
    category: 'utility',
    description: 'Zaawansowana mapa świata w czasie rzeczywistym z radarami, jaskiniami i waypointami',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    conflicts: ['xaeros-minimap'],
    dependencies: [],
    author: 'techbrew'
  },
  {
    id: 'xaeros-minimap',
    name: "Xaero's Minimap",
    category: 'utility',
    description: 'Lekka, zbalansowana minimapa w rogu ekranu bez lagów',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    conflicts: ['journeymap'],
    dependencies: [],
    author: 'xaero96'
  },

  // Technologia & Treść
  {
    id: 'create',
    name: 'Create',
    category: 'technology',
    description: 'Rewolucyjna inżynieria kinetyczna, koła wodne, wiatraki, pociągi i ruchome fabryki',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.21.1'],
    dependencies: ['fabric-api'],
    author: 'simibubi'
  },
  {
    id: 'farmers-delight',
    name: "Farmer's Delight",
    category: 'gameplay',
    description: 'Wzbogacenie rolnictwa i gotowania: deski do krojenia, garnki, nowe potrawy i zupy',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'vectorwing'
  },
  {
    id: 'waystones',
    name: 'Waystones',
    category: 'gameplay',
    description: 'Magiczne kamienie drogowe do szybkiego powrotu do domu i wymiany podróży z graczami',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1'],
    dependencies: [],
    author: 'BlayTheNinth'
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
    category: 'adventure',
    description: 'Rzadkie magiczne przedmioty i akcesoria ukryte w skrzyniach w ruinach i podziemiach',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'ochotonida'
  },
  {
    id: 'terralith',
    name: 'Terralith',
    category: 'worldgen',
    description: 'Ponad 85 zapierających dech w piersiach biomów (wulkany, kaniony, fiordy) bez dodawania nowych bloków',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: [],
    author: 'Starmute'
  },
  {
    id: 'better-dungeons',
    name: "YUNG's Better Dungeons",
    category: 'worldgen',
    description: 'Całkowicie przeprojektowane lochy i podziemia z pułapkami i wciągającą architekturą',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: ['yungs-api'],
    author: 'YUNGNICKYOUNG'
  },
  {
    id: 'better-mineshafts',
    name: "YUNG's Better Mineshafts",
    category: 'worldgen',
    description: 'Zupełnie nowe, klimatyczne opuszczone kopalnie z różnorodnymi biomami i wózkami',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: ['yungs-api'],
    author: 'YUNGNICKYOUNG'
  },
  {
    id: 'better-strongholds',
    name: "YUNG's Better Strongholds",
    category: 'worldgen',
    description: 'Monumentalne twierdze portalu Kresu z wieżami, bibliotekami i skarbami',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
    dependencies: ['yungs-api'],
    author: 'YUNGNICKYOUNG'
  },
  {
    id: 'irons-spells-n-spellbooks',
    name: "Iron's Spells 'n Spellbooks",
    category: 'magic',
    description: 'Rozbudowany system magii RPG ze szkołami żywiołów, księgami czarów i starożytnymi bossami',
    loaders: ['fabric', 'neoforge'],
    versions: ['1.20.1', '1.21.1'],
    dependencies: [],
    author: 'Ironfurnaces'
  }
];

export const INITIAL_DEFAULT_MODPACK: ModpackData = {
  name: 'CraftPack RPG & Shaders Pro',
  summary: 'Starannie zoptymalizowana paczka łącząca eksplorację RPG, gotowanie Farmer\'s Delight, stabilne 144+ FPS z Sodium i pełne wsparcie dla shaderów Iris.',
  version: '1.0.0',
  author: 'CraftPack Architect AI',
  loader: 'fabric',
  mcVersion: '1.21.1',
  recommendedMemory: '6GB - 8GB',
  shaderAdvice: 'Rekomendowane: Complementary Reimagined r5.1 lub BSL Shaders v8.2 na profilu Medium.',
  changelog: [
    'Inicjalne wydanie paczki gotowej do importu w Modrinth App / Prism Launcher.',
    'Włączono moduły akceleracji grafiki Sodium + Iris Shaders.',
    'Dodano zbalansowane konfiguracje RAMSaver (FerriteCore) oraz płynnego renderowania GUI.',
    'Zintegrowano Farmer\'s Delight, AppleSkin, Jade oraz Waystones.'
  ],
  mods: [
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'fabric-api')!, enabled: true, reason: 'Niezbędne środowisko uruchomieniowe Fabric' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'sodium')!, enabled: true, reason: 'Silnik renderujący +300% FPS' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'iris')!, enabled: true, reason: 'Wsparcie shaderów bez spadków wydajności' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'lithium')!, enabled: true, reason: 'Optymalizacja fizyki i AI gry po stronie CPU' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'ferrite-core')!, enabled: true, reason: 'Mniejsze zużycie pamięci RAM' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'immediatelyfast')!, enabled: true, reason: 'Szybkie renderowanie ekwipunku i map' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'entityculling')!, enabled: true, reason: 'Ukrywanie niewidocznych mobów' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'cloth-config')!, enabled: true, reason: 'Menu konfiguracji modów w grze' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'architectury-api')!, enabled: true, reason: 'Biblioteka bazowa dla modów RPG' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'rei')!, enabled: true, reason: 'Przeglądanie receptur przedmiotów' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'jade')!, enabled: true, reason: 'Podgląd wskazywanych bloków i skrzyń' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'appleskin')!, enabled: true, reason: 'Wskaźnik nasycenia i odżywiania' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'xaeros-minimap')!, enabled: true, reason: 'Lekka minimapa w rogu' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'farmers-delight')!, enabled: true, reason: 'Gotowanie i rolnictwo' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'waystones')!, enabled: true, reason: 'Odkrywanie obelisków i podróżowanie' },
    { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'terralith')!, enabled: true, reason: '85+ malowniczych biomów świata' }
  ],
  configs: [
    {
      path: 'config/sodium-options.json',
      content: JSON.stringify({
        general: {
          render_distance: 14,
          simulation_distance: 10,
          brightness: 100,
          fullscreen: false
        },
        quality: {
          graphics_quality: 'HIGH',
          weather_quality: 'FAST',
          leaves_quality: 'FAST',
          vignette: true
        },
        performance: {
          chunk_builder_threads: 0,
          always_defer_chunk_updates: true,
          use_compact_vertex_format: true
        }
      }, null, 2),
      description: 'Optymalizacja renderowania klatek Sodium pod monitory 144Hz+'
    },
    {
      path: 'config/ferritecore.mixin.properties',
      content: `# Konfiguracja optymalizatora pamięci RAM FerriteCore
memory.fast_blockstate_cache=true
memory.deduplicate_strings=true
memory.compact_fastutil=true
memory.neighbor_lookup=true
`,
      description: 'Agresywna kompresja nieużywanych danych bloków w pamięci RAM'
    },
    {
      path: 'config/craftpack-tuning.json',
      content: JSON.stringify({
        packIdentifier: 'craftpack-rpg-shaders-1.21.1',
        launcherTarget: 'Modrinth / Prism Launcher',
        allocatedRamRecommended: '6144M',
        jvmArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch',
        shaderPreset: 'Complementary Reimagined r5.1'
      }, null, 2),
      description: 'Zalecenia parametrów Java Virtual Machine (JVM) i alokacji pamięci'
    }
  ]
};

export const PRESET_PACKS: ModpackData[] = [
  INITIAL_DEFAULT_MODPACK,
  {
    name: 'Create & Industrial Factory',
    summary: 'Kompleksowa paczka skupiona na inżynierii Create, automatyzacji kinetycznej, logistyce pociągów oraz pełnej synchronizacji JEI.',
    version: '1.0.0',
    author: 'CraftPack Architect AI',
    loader: 'fabric',
    mcVersion: '1.20.1',
    recommendedMemory: '8GB',
    shaderAdvice: 'MakeUp Ultra Fast lub Complementary Shaders na profilu Low dla płynnych obrotów maszyn.',
    changelog: ['Inicjalna konfiguracja modułu Create z JEI i optymalizacjami Sodium.'],
    mods: [
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'fabric-api')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'sodium')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'lithium')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'ferrite-core')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'immediatelyfast')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'create')!, enabled: true, reason: 'Główny silnik inżynierii kinetycznej' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'jei')!, enabled: true, reason: 'Wyszukiwanie receptur maszyn i kół' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'jade')!, enabled: true, reason: 'Podgląd jednostek obrotowych Stress/Speed' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'farmers-delight')!, enabled: true }
    ],
    configs: [
      {
        path: 'config/create-client.toml',
        content: `[graphics]\nrenderDistance = 256\nuseCombinedWorld = true\n`,
        description: 'Płynne renderowanie mechanizmów Create'
      },
      {
        path: 'config/sodium-options.json',
        content: JSON.stringify({ general: { render_distance: 12, simulation_distance: 8 } }, null, 2),
        description: 'Dedykowane ustawienia pod intensywne obliczenia fabryk'
      }
    ]
  },
  {
    name: 'NeoForge RPG Sorcery & Bosses',
    summary: 'Mroczny świat magii na loaderze NeoForge z księgami czarów, reliktami Artifacts, lochami Better Dungeons i nowym generatorem świata.',
    version: '1.0.0',
    author: 'CraftPack Architect AI',
    loader: 'neoforge',
    mcVersion: '1.21.1',
    recommendedMemory: '8GB',
    shaderAdvice: 'BSL Shaders v8.2 lub Solas Shaders z efektami atmosferycznymi magii.',
    changelog: ['Pierwsze wydanie zestawu RPG z systemem czarów i ulepszonych podziemi.'],
    mods: [
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'sodium')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'iris')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'ferrite-core')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'modernfix')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'irons-spells-n-spellbooks')!, enabled: true, reason: 'System rzucania czarów RPG' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'artifacts')!, enabled: true, reason: 'Magiczny ekwipunek' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'better-dungeons')!, enabled: true, reason: 'Większe lochy z bossami' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'terralith')!, enabled: true, reason: 'Nowe biomy fantasy' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'waystones')!, enabled: true, reason: 'Teleportacja między wymiarami' },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'appleskin')!, enabled: true },
      { ...POPULAR_AVAILABLE_MODS.find(m => m.id === 'jei')!, enabled: true }
    ],
    configs: [
      {
        path: 'config/irons_spells_jsons.json',
        content: JSON.stringify({ manaBarPosition: 'BOTTOM_CENTER', showSpellCooldownHud: true }, null, 2),
        description: 'Dostosowanie paska many i interfejsu czarów'
      }
    ]
  }
];
