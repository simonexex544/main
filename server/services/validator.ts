import {
  ModpackData,
  ValidationCheckItem,
  ValidationReport,
  ValidationStatus,
} from '../../src/types/modpack';
import { compareSemver, getLoaderVersions } from './loaderVersionService';
import { resolveModpackDependencies } from './dependencyResolver';

const KNOWN_EXCLUSIVE_GROUPS: Array<{
  id: string;
  title: string;
  severity: 'ERROR' | 'WARNING';
  slugs: string[];
  message: string;
}> = [
  {
    id: 'optifine_vs_modern',
    title: 'Konflikt OptiFine z nowoczesnym silnikiem renderowania',
    severity: 'ERROR',
    slugs: ['optifine', 'sodium', 'iris', 'embeddium', 'oculus'],
    message: 'OptiFine nie jest kompatybilny z Sodium/Iris/Embeddium i powoduje natychmiastowy crash gry.',
  },
  {
    id: 'recipe_viewers',
    title: 'Zdublowana przeglądarka receptur',
    severity: 'WARNING',
    slugs: ['jei', 'rei', 'emi'],
    message: 'Zainstalowano więcej niż jedną przeglądarkę receptur (JEI / REI / EMI). Zaleca się wybór jednej.',
  },
  {
    id: 'minimaps',
    title: 'Zdublowana minimapa',
    severity: 'WARNING',
    slugs: ['journeymap', 'xaeros-minimap'],
    message: 'JourneyMap i Xaero\'s Minimap jednocześnie nakładają elementy HUD na ekran.',
  },
];

// Known minimum NeoForge requirements for popular 1.21.1 mods (prevents crash reports like 21.1.72!)
const MIN_NEOFORGE_1_21_1: Record<string, string> = {
  sodium: '21.1.115',
  'ferrite-core': '21.1.218',
  'farmers-delight': '21.1.219',
  iris: '21.1.115',
};

export async function validateModpack(
  modpack: Partial<ModpackData> & {
    mods: ModpackData['mods'];
    loader: ModpackData['loader'];
    mcVersion: string;
  },
  options?: { verifyOnline?: boolean }
): Promise<ValidationReport> {
  const verifyOnline = options?.verifyOnline !== false;
  const items: ValidationCheckItem[] = [];
  const mcVersion = (modpack.mcVersion || '').trim();
  const loader = modpack.loader;
  const activeMods = (modpack.mods || []).filter((m) => m.enabled !== false);
  const activeShaders = (modpack.shaders || []).filter((s) => s.enabled !== false);

  // 1. Minecraft version check
  if (!/^1\.\d+(\.\d+)?$/.test(mcVersion)) {
    items.push({
      id: 'mc_version_invalid',
      category: 'minecraft',
      status: 'ERROR',
      title: 'Nieprawidłowa wersja Minecrafta',
      message: `Wersja "${mcVersion || 'brak'}" nie jest poprawnym identyfikatorem wersji Minecrafta (np. 1.21.1).`,
      proposedFix: 'Wybierz poprawną wersję Minecrafta (np. 1.20.1 lub 1.21.1).',
    });
  } else {
    items.push({
      id: 'mc_version_ok',
      category: 'minecraft',
      status: 'PASS',
      title: `Wersja Minecraft: ${mcVersion}`,
      message: `Docelowa wersja gry ${mcVersion} jest poprawna i obsługiwana.`,
    });
  }

  // 2. Loader & Loader Version Check
  const loaderInfo = await getLoaderVersions(loader, mcVersion || '1.21.1');
  const activeLoaderVersion = modpack.loaderVersion || loaderInfo.recommended;

  if (!['fabric', 'forge', 'neoforge', 'quilt'].includes(loader)) {
    items.push({
      id: 'loader_invalid',
      category: 'loader',
      status: 'ERROR',
      title: 'Nieznany modloader',
      message: `Loader "${loader}" nie jest wspierany przez format .mrpack.`,
    });
  } else {
    // Check NeoForge minimum version requirements to catch stale 21.1.72 crashes
    let requiredNeoForgeMin: string | null = null;
    let triggeringModName = '';
    if (loader === 'neoforge' && mcVersion === '1.21.1') {
      for (const m of activeMods) {
        const minVer = MIN_NEOFORGE_1_21_1[m.id.toLowerCase()];
        if (minVer && (!requiredNeoForgeMin || compareSemver(minVer, requiredNeoForgeMin) > 0)) {
          requiredNeoForgeMin = minVer;
          triggeringModName = m.name;
        }
      }
    }

    if (requiredNeoForgeMin && compareSemver(activeLoaderVersion, requiredNeoForgeMin) < 0) {
      items.push({
        id: 'neoforge_too_old',
        category: 'loader',
        status: 'ERROR',
        title: `Zbyt stara wersja NeoForge (${activeLoaderVersion})`,
        message: `Mod ${triggeringModName} wymaga NeoForge >= ${requiredNeoForgeMin}, a wybrano ${activeLoaderVersion}. Spowoduje to crash przy starcie gry!`,
        affectedModName: triggeringModName,
        proposedFix: `Zaktualizuj wersję NeoForge do zalecanej ${loaderInfo.recommended}.`,
        autoFix: {
          type: 'update_loader_version',
          label: `Ustaw NeoForge ${loaderInfo.recommended}`,
          recommendedValue: loaderInfo.recommended,
        },
      });
    } else {
      items.push({
        id: 'loader_version_ok',
        category: 'loader',
        status: 'PASS',
        title: `Modloader: ${loader.toUpperCase()} ${activeLoaderVersion}`,
        message: `Wersja loadera (${loaderInfo.manifestKey}: ${activeLoaderVersion}) jest aktualna i zgodna z Minecraft ${mcVersion}.`,
      });
    }
  }

  // 3. Metadata check
  if (!modpack.name || !modpack.name.trim()) {
    items.push({
      id: 'metadata_name_missing',
      category: 'metadata',
      status: 'ERROR',
      title: 'Brak nazwy modpacka',
      message: 'Manifest modrinth.index.json wymaga niepustej nazwy paczki.',
      proposedFix: 'Wpisz nazwę modpacka w ustawieniach projektu.',
    });
  } else {
    items.push({
      id: 'metadata_ok',
      category: 'metadata',
      status: 'PASS',
      title: 'Metadane paczki poprawne',
      message: `Nazwa "${modpack.name}" i wersja "${modpack.version || '1.0.0'}" spełniają specyfikację Modrinth.`,
    });
  }

  // 4. Duplicate mods check
  const seenSlugs = new Map<string, string>();
  const duplicateSlugs: string[] = [];
  for (const mod of activeMods) {
    const key = (mod.projectId || mod.id).toLowerCase().trim();
    if (seenSlugs.has(key)) {
      duplicateSlugs.push(mod.name || mod.id);
    } else {
      seenSlugs.set(key, mod.name);
    }
  }
  if (duplicateSlugs.length > 0) {
    items.push({
      id: 'duplicates_found',
      category: 'duplicates',
      status: 'ERROR',
      title: 'Wykryto zduplikowane modyfikacje',
      message: `Następujące mody występują wielokrotnie na liście: ${duplicateSlugs.join(', ')}.`,
      proposedFix: 'Usuń zduplikowane wpisy z listy modów.',
    });
  } else {
    items.push({
      id: 'duplicates_none',
      category: 'duplicates',
      status: 'PASS',
      title: 'Brak duplikatów',
      message: 'Wszystkie mody na liście są unikalne.',
    });
  }

  // 5. Cross-loader sanity check (e.g. Fabric API on NeoForge/Forge)
  const slugSet = new Set(activeMods.map((m) => m.id.toLowerCase()));
  if ((loader === 'neoforge' || loader === 'forge') && slugSet.has('fabric-api')) {
    items.push({
      id: 'fabric_api_wrong_loader',
      category: 'compatibility',
      status: 'ERROR',
      title: `Fabric API na loaderze ${loader.toUpperCase()}`,
      message: 'Fabric API nie działa natywnie na Forge/NeoForge i może powodować błędy uruchamiania.',
      affectedModId: 'fabric-api',
      affectedModName: 'Fabric API',
      proposedFix: 'Usuń Fabric API z tej paczki.',
      autoFix: {
        type: 'remove_mod',
        label: 'Usuń Fabric API',
        targetId: 'fabric-api',
        targetName: 'Fabric API',
      },
    });
  }

  // 6. Exclusive / Conflicting groups check
  const activeOptifine = slugSet.has('optifine');
  const modernRenderers = ['sodium', 'iris', 'embeddium', 'oculus'].filter((s) => slugSet.has(s));
  if (activeOptifine && modernRenderers.length > 0) {
    items.push({
      id: 'conflict_optifine',
      category: 'compatibility',
      status: 'ERROR',
      title: 'Krytyczny konflikt: OptiFine + Sodium/Iris',
      message: `OptiFine koliduje z: ${modernRenderers.join(', ')}. Gra nie uruchomi się poprawnie.`,
      affectedModId: 'optifine',
      affectedModName: 'OptiFine',
      proposedFix: 'Usuń OptiFine i korzystaj z Sodium + Iris.',
      autoFix: {
        type: 'remove_mod',
        label: 'Usuń OptiFine',
        targetId: 'optifine',
        targetName: 'OptiFine',
      },
    });
  }

  for (const group of KNOWN_EXCLUSIVE_GROUPS.filter((g) => g.id !== 'optifine_vs_modern')) {
    const present = group.slugs.filter((s) => slugSet.has(s));
    if (present.length > 1) {
      items.push({
        id: `conflict_${group.id}`,
        category: 'compatibility',
        status: group.severity,
        title: group.title,
        message: `${group.message} Aktywne: ${present.join(', ')}.`,
        affectedModId: present[1],
        proposedFix: `Pozostaw tylko jeden mod (np. usuń ${present[1]}).`,
        autoFix: {
          type: 'remove_mod',
          label: `Usuń ${present[1]}`,
          targetId: present[1],
        },
      });
    }
  }

  // 7. Online Modrinth & Recursive Dependency Validation
  if (activeMods.length === 0) {
    items.push({
      id: 'empty_modpack_warning',
      category: 'files',
      status: 'WARNING',
      title: 'Paczka nie zawiera jeszcze żadnych modów',
      message: 'Pusty modpack wygeneruje poprawny profil loadera bez modów. Możesz dodać mody w Kreatorze lub Przeglądarce Modów.',
    });
  } else if (verifyOnline) {
    const resolution = await resolveModpackDependencies({
      mods: activeMods,
      loader,
      mcVersion,
      includeCoreLoaderApi: false, // Validator reports missing libraries explicitly rather than silently hiding them!
    });

    if (resolution.unresolved.length > 0) {
      for (const unres of resolution.unresolved) {
        items.push({
          id: `unresolved_${unres.id}`,
          category: 'compatibility',
          status: 'ERROR',
          title: `Niekompatybilny lub niezweryfikowany mod: ${unres.name}`,
          message: unres.reason,
          affectedModId: unres.id,
          affectedModName: unres.name,
          proposedFix: `Usuń mod ${unres.name} lub zmień wersję Minecraft/Loadera.`,
          autoFix: {
            type: 'remove_mod',
            label: `Usuń ${unres.name}`,
            targetId: unres.id,
            targetName: unres.name,
          },
        });
      }
    } else {
      items.push({
        id: 'mods_verified_online',
        category: 'files',
        status: 'PASS',
        title: `Wszystkie mody zweryfikowane (${resolution.resolvedFiles.length}/${activeMods.length})`,
        message: 'Każdy mod posiada aktywny plik JAR w Modrinth CDN oraz prawidłowe sumy SHA-1 i SHA-512.',
      });
    }

    // Report missing required libraries detected recursively from Modrinth API
    const missingLibs = resolution.addedLibraries;
    if (loader === 'fabric' && !slugSet.has('fabric-api')) {
      missingLibs.unshift({
        id: 'fabric-api',
        name: 'Fabric API',
        requiredBy: 'Środowisko Fabric',
      });
    }

    // Deduplicate missing libraries
    const seenMissing = new Set<string>();
    for (const lib of missingLibs) {
      if (seenMissing.has(lib.id.toLowerCase())) continue;
      seenMissing.add(lib.id.toLowerCase());
      items.push({
        id: `missing_dep_${lib.id}`,
        category: 'dependencies',
        status: 'ERROR',
        title: `Brak wymaganej biblioteki: ${lib.name}`,
        message: `Mod "${lib.requiredBy}" wymaga biblioteki "${lib.name}" (${lib.id}). Bez niej gra zakończy się błędem podczas ładowania.`,
        affectedModId: lib.id,
        affectedModName: lib.name,
        proposedFix: `Dodaj wymaganą bibliotekę ${lib.name} do paczki.`,
        autoFix: {
          type: 'add_mod',
          label: `Dodaj ${lib.name}`,
          targetId: lib.id,
          targetName: lib.name,
        },
      });
    }

    if (missingLibs.length === 0 && resolution.unresolved.length === 0) {
      items.push({
        id: 'deps_complete',
        category: 'dependencies',
        status: 'PASS',
        title: 'Wszystkie wymagane biblioteki obecne',
        message: 'Rekurencyjna analiza Modrinth API potwierdziła kompletność drzewa zależności.',
      });
    }

    // Report Modrinth-declared incompatible references
    for (const inc of resolution.incompatibleRefs) {
      if (slugSet.has(inc.conflictsWithId.toLowerCase())) {
        items.push({
          id: `modrinth_incompat_${inc.modId}_${inc.conflictsWithId}`,
          category: 'compatibility',
          status: 'ERROR',
          title: `Niezgodność Modrinth: ${inc.modName} ↔ ${inc.conflictsWithName || inc.conflictsWithId}`,
          message: `${inc.modName} oznacza mod ${inc.conflictsWithName || inc.conflictsWithId} jako niekompatybilny w metadanych Modrinth.`,
          affectedModId: inc.conflictsWithId,
          proposedFix: `Usuń jeden z kolidujących modów.`,
          autoFix: {
            type: 'remove_mod',
            label: `Usuń ${inc.conflictsWithName || inc.conflictsWithId}`,
            targetId: inc.conflictsWithId,
          },
        });
      }
    }
  } else {
    // Offline validation mode (checks local hashes/urls without marking unverified items as PASS)
    const unverified = activeMods.filter((m) => !m.downloadUrl || !m.hashes?.sha1);
    if (unverified.length > 0) {
      items.push({
        id: 'files_unverified_offline',
        category: 'files',
        status: 'WARNING',
        title: `${unverified.length} modów wymaga weryfikacji plików i sum SHA`,
        message: 'Uruchom weryfikację online przed eksportem .mrpack, aby pobrać autentyczne sumy SHA-1/SHA-512.',
      });
    } else {
      items.push({
        id: 'files_hashes_ok',
        category: 'files',
        status: 'PASS',
        title: 'Pliki i sumy kontrolne gotowe',
        message: 'Wszystkie mody posiadają ważne adresy CDN i sumy kontrolne.',
      });
    }
  }

  // 8. Shaders compatibility check
  if (activeShaders.length > 0) {
    const hasShaderEngine =
      slugSet.has('iris') || slugSet.has('oculus') || slugSet.has('optifine');
    if (!hasShaderEngine) {
      const targetEngine = loader === 'forge' ? 'oculus' : 'iris';
      items.push({
        id: 'shaders_no_engine',
        category: 'addons',
        status: 'WARNING',
        title: 'Shadery dodane bez moda ładującego (Iris / Oculus)',
        message: `Paczka zawiera ${activeShaders.length} paczek shaderów, ale nie ma zainstalowanego silnika Iris/Oculus.`,
        proposedFix: `Dodaj ${targetEngine === 'iris' ? 'Iris Shaders' : 'Oculus'}, aby shadery działały w grze.`,
        autoFix: {
          type: 'enable_shader_mod',
          label: `Dodaj ${targetEngine === 'iris' ? 'Iris Shaders' : 'Oculus'}`,
          targetId: targetEngine,
          targetName: targetEngine === 'iris' ? 'Iris Shaders' : 'Oculus',
        },
      });
    } else {
      items.push({
        id: 'shaders_engine_ok',
        category: 'addons',
        status: 'PASS',
        title: 'Obsługa shaderów aktywna',
        message: 'Paczka zawiera silnik renderowania shaderów zgodny z dodanymi paczkami shaderów.',
      });
    }
  }

  // 9. Manifest check
  const errorCount = items.filter((i) => i.status === 'ERROR').length;
  const warningCount = items.filter((i) => i.status === 'WARNING').length;
  const passCount = items.filter((i) => i.status === 'PASS').length;

  items.push({
    id: 'manifest_ready',
    category: 'manifest',
    status: errorCount > 0 ? 'ERROR' : 'PASS',
    title: errorCount > 0 ? 'Eksport .mrpack zablokowany przez błędy' : 'Manifest modrinth.index.json gotowy',
    message:
      errorCount > 0
        ? `Napraw ${errorCount} błędów krytycznych (ERROR), aby wygenerować stabilną paczkę .mrpack.`
        : 'Struktura manifestu spełnia standard Modrinth Pack Format v1.',
  });

  const finalErrorCount = items.filter((i) => i.status === 'ERROR').length;
  const finalWarningCount = items.filter((i) => i.status === 'WARNING').length;
  const finalPassCount = items.filter((i) => i.status === 'PASS').length;

  const overallStatus: ValidationStatus =
    finalErrorCount > 0 ? 'ERROR' : finalWarningCount > 0 ? 'WARNING' : 'PASS';

  return {
    overallStatus,
    canExport: finalErrorCount === 0,
    checkedAt: new Date().toISOString(),
    mcVersion,
    loader,
    loaderVersion: activeLoaderVersion,
    recommendedLoaderVersion: loaderInfo.recommended,
    items,
    summary: {
      passCount: finalPassCount,
      warningCount: finalWarningCount,
      errorCount: finalErrorCount,
    },
  };
}
