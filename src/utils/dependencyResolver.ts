import { ModItem, ModLoader, MinecraftVersion } from '../types/modpack';
import { POPULAR_AVAILABLE_MODS } from '../data/presetPacks';

export interface DependencyRule {
  targetSlugs: string[]; // Slugs or regex/keywords matching the parent mod
  requiredLibraries: Array<{
    id: string;
    name: string;
    category?: 'library' | 'optimization';
    description: string;
    author?: string;
  }>;
}

// Comprehensive registry of Minecraft mod libraries and their required dependencies
export const DEPENDENCY_REGISTRY: DependencyRule[] = [
  // 1. YUNG's mods family -> YUNG's API
  {
    targetSlugs: [
      'better-mineshafts',
      'yungs-better-mineshafts',
      'better-dungeons',
      'yungs-better-dungeons',
      'better-strongholds',
      'yungs-better-strongholds',
      'better-desert-temples',
      'yungs-better-desert-temples',
      'better-ocean-monuments',
      'yungs-better-ocean-monuments',
      'better-witch-huts',
      'yungs-better-witch-huts',
      'better-nether-fortresses',
      'yungs-better-nether-fortresses',
      'better-end-island',
      'yungs-better-end-island',
      'yungs-bridges',
      'yungs-extras'
    ],
    requiredLibraries: [
      {
        id: 'yungs-api',
        name: "YUNG's API",
        category: 'library',
        description: "Podstawowa biblioteka wymagana przez wszystkie mody generacji struktur autorstwa YUNGNICKYOUNG.",
        author: 'YUNGNICKYOUNG'
      }
    ]
  },

  // 2. Iron's Spells 'n Spellbooks -> player-animator
  {
    targetSlugs: ['irons-spells-n-spellbooks', 'irons-spells'],
    requiredLibraries: [
      {
        id: 'player-animator',
        name: 'playerAnimator',
        category: 'library',
        description: 'Zaawansowana biblioteka animacji postaci gracza wymagana do rzucania czarów.',
        author: 'KosmX'
      }
    ]
  },

  // 3. Alex's Mobs / Alex's Caves -> Citadel
  {
    targetSlugs: ['alexs-mobs', 'alexs-caves'],
    requiredLibraries: [
      {
        id: 'citadel',
        name: 'Citadel',
        category: 'library',
        description: 'Biblioteka animacji szkieletowych i zaawansowanego AI mobów.',
        author: 'sbom_xela'
      }
    ]
  },

  // 4. Artifacts -> Trinkets (Fabric) or Curios (NeoForge)
  {
    targetSlugs: ['artifacts'],
    requiredLibraries: [
      {
        id: 'trinkets',
        name: 'Trinkets',
        category: 'library',
        description: 'Biblioteka dodatkowych slotów ekwipunku dla akcesoriów i pierścieni.',
        author: 'emilyploszaj'
      }
    ]
  },

  // 5. Iris Shaders -> Sodium
  {
    targetSlugs: ['iris'],
    requiredLibraries: [
      {
        id: 'sodium',
        name: 'Sodium',
        category: 'optimization',
        description: 'Silnik renderujący wymagany do działania shaderów Iris.',
        author: 'jellysquid3'
      }
    ]
  },

  // 6. Roughly Enough Items (REI) -> Cloth Config + Architectury API
  {
    targetSlugs: ['rei', 'roughly-enough-items'],
    requiredLibraries: [
      {
        id: 'cloth-config',
        name: 'Cloth Config v15',
        category: 'library',
        description: 'Ekran konfiguracji modów w menu gry.',
        author: 'shedaniel'
      },
      {
        id: 'architectury-api',
        name: 'Architectury API',
        category: 'library',
        description: 'Uniwersalna warstwa abstrakcji wieloplatformowej.',
        author: 'shedaniel'
      }
    ]
  },

  // 7. Create -> Fabric API (on Fabric)
  {
    targetSlugs: ['create'],
    requiredLibraries: [
      {
        id: 'fabric-api',
        name: 'Fabric API',
        category: 'library',
        description: 'Kluczowe API i zdarzenia silnika Fabric.',
        author: 'Modmuss50'
      }
    ]
  },

  // 8. GeckoLib dependent mods
  {
    targetSlugs: ['geckolib-dependent', 'born-in-chaos', 'mutant-monsters'],
    requiredLibraries: [
      {
        id: 'geckolib',
        name: 'GeckoLib',
        category: 'library',
        description: 'Silnik animacji modeli 3D i cząsteczek.',
        author: 'Gecko'
      }
    ]
  }
];

export interface AutoResolveResult {
  updatedMods: ModItem[];
  addedLibraries: Array<{ id: string; name: string; requiredBy: string }>;
}

/**
 * Automatically inspects a mod list and injects missing libraries.
 * Returns the updated mod list along with a list of auto-added dependencies for user notification.
 */
export function autoResolveDependencies(
  mods: ModItem[],
  loader: ModLoader,
  mcVersion: MinecraftVersion
): AutoResolveResult {
  const currentModIds = new Set(mods.map(m => m.id.toLowerCase().trim()));
  const addedLibraries: Array<{ id: string; name: string; requiredBy: string }> = [];
  const resultMods = [...mods];

  // If loader is Fabric and fabric-api is missing, auto-add it!
  if (loader === 'fabric' && !currentModIds.has('fabric-api')) {
    const fabApiMod: ModItem = {
      id: 'fabric-api',
      name: 'Fabric API',
      category: 'library',
      description: 'Główna biblioteka i interfejsy haczyków silnika Fabric dla Minecrafta.',
      isCore: true,
      enabled: true,
      loaders: ['fabric'],
      versions: ['1.20.1', '1.20.4', '1.21.1', '1.21.4'],
      reason: 'Automatycznie dołączona biblioteka podstawowa dla loadera Fabric'
    };
    resultMods.unshift(fabApiMod);
    currentModIds.add('fabric-api');
    addedLibraries.push({
      id: 'fabric-api',
      name: 'Fabric API',
      requiredBy: 'Środowisko Fabric'
    });
  }

  // Iterate over each mod in the pack and check against our dependency rules
  for (const mod of mods) {
    const slug = (mod.id || '').toLowerCase().trim();
    const name = (mod.name || '').toLowerCase().trim();

    for (const rule of DEPENDENCY_REGISTRY) {
      const matches = rule.targetSlugs.some(
        target => slug === target || slug.includes(target) || name.includes(target.replace(/-/g, ' '))
      );

      if (matches) {
        for (const lib of rule.requiredLibraries) {
          const libId = lib.id.toLowerCase();

          // On NeoForge, skip Fabric API or adapt Trinkets to Curios
          if (loader === 'neoforge' && libId === 'fabric-api') continue;

          if (!currentModIds.has(libId)) {
            // Find existing definition or build one
            const catalogMod = POPULAR_AVAILABLE_MODS.find(m => m.id.toLowerCase() === libId);
            
            const newLibMod: ModItem = catalogMod
              ? {
                  ...catalogMod,
                  enabled: true,
                  isCore: true,
                  reason: `Automatycznie dołączona biblioteka bazowa dla: ${mod.name}`
                }
              : {
                  id: lib.id,
                  name: lib.name,
                  category: lib.category || 'library',
                  description: lib.description,
                  isCore: true,
                  enabled: true,
                  author: lib.author,
                  loaders: [loader],
                  versions: [mcVersion],
                  reason: `Automatycznie dołączona biblioteka bazowa dla: ${mod.name}`
                };

            resultMods.push(newLibMod);
            currentModIds.add(libId);
            addedLibraries.push({
              id: lib.id,
              name: lib.name,
              requiredBy: mod.name
            });
          }
        }
      }
    }
  }

  return {
    updatedMods: resultMods,
    addedLibraries
  };
}
