import JSZip from 'jszip';
import { ModLoader, ModpackData } from '../types/modpack';
import { exportQuestLineToSnbtFiles } from './questExporter';

export interface ResolveReport {
  files: Array<{
    path: string;
    hashes: { sha1: string; sha512: string };
    env: { client: string; server: string };
    downloads: string[];
    fileSize: number;
  }>;
  resolvedCount: number;
  totalCount: number;
  unresolved: Array<{ id: string; name: string; reason: string }>;
  addedLibraries?: Array<{ id: string; name: string; requiredBy: string }>;
  dependencies: Record<string, string>;
}

export interface ArchiveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: {
    formatVersion: number;
    game: string;
    name: string;
    versionId: string;
    filesCount: number;
    dependencies: Record<string, string>;
    overridesCount: number;
  };
}

export function getLoaderManifestKey(
  loader: ModLoader
): 'fabric-loader' | 'forge' | 'neoforge' | 'quilt-loader' {
  switch (loader) {
    case 'fabric':
      return 'fabric-loader';
    case 'neoforge':
      return 'neoforge';
    case 'forge':
      return 'forge';
    case 'quilt':
      return 'quilt-loader';
  }
}

export async function resolveRealModrinthFiles(modpack: ModpackData): Promise<ResolveReport> {
  const activeMods = modpack.mods.filter((m) => m.enabled !== false);

  const res = await fetch('/api/resolve-mrpack-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mods: activeMods,
      loader: modpack.loader,
      mcVersion: modpack.mcVersion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Błąd serwera podczas rozwiązywania plików Modrinth (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!data.success || !Array.isArray(data.files)) {
    throw new Error(data.error || 'Nie udało się zweryfikować plików modów w Modrinth API.');
  }

  // Respect explicit user-selected loaderVersion if provided and newer/valid
  const loaderKey = getLoaderManifestKey(modpack.loader);
  const deps = { ...data.dependencies };
  if (modpack.loaderVersion) {
    deps[loaderKey] = modpack.loaderVersion;
  }

  return {
    ...data,
    dependencies: deps,
  };
}

export async function validateMrpackArchive(
  data: Blob | ArrayBuffer | Uint8Array
): Promise<ArchiveValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const zip = await JSZip.loadAsync(data);
    const indexEntry = zip.file('modrinth.index.json');
    if (!indexEntry) {
      return {
        valid: false,
        errors: ['Brak wymaganego pliku modrinth.index.json w głównym katalogu archiwum .mrpack.'],
        warnings,
      };
    }

    const indexText = await indexEntry.async('string');
    const manifest = JSON.parse(indexText);

    if (manifest.formatVersion !== 1) {
      errors.push(`Nieprawidłowa wartość formatVersion: ${manifest.formatVersion} (wymagane: 1).`);
    }
    if (manifest.game !== 'minecraft') {
      errors.push(`Nieprawidłowa wartość game: "${manifest.game}" (wymagane: "minecraft").`);
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Brak nazwy paczki w modrinth.index.json.');
    }
    if (!manifest.dependencies?.minecraft) {
      errors.push('Brak dependencies.minecraft w manifeście.');
    }

    const loaderKeys = ['fabric-loader', 'forge', 'neoforge', 'quilt-loader'];
    const presentLoaderKey = loaderKeys.find((k) => Boolean(manifest.dependencies?.[k]));
    if (!presentLoaderKey) {
      errors.push('Brak klucza modloadera (fabric-loader / forge / neoforge / quilt-loader) w dependencies.');
    }

    if (!Array.isArray(manifest.files)) {
      errors.push('Pole files w manifeście musi być tablicą.');
    } else {
      for (const f of manifest.files) {
        if (!f.path || !f.hashes?.sha1 || !f.hashes?.sha512 || !Array.isArray(f.downloads) || !f.downloads[0]) {
          errors.push(`Niekompletny wpis pliku w manifeście: ${f.path || 'nieznany'}`);
        }
        if (f.downloads?.[0] && !f.downloads[0].startsWith('https://')) {
          errors.push(`Nieprawidłowy URL pobierania dla ${f.path}: ${f.downloads[0]}`);
        }
      }
    }

    const allPaths = Object.keys(zip.files);
    const overridesCount = allPaths.filter((p) => p.startsWith('overrides/') && !zip.files[p].dir).length;
    if (overridesCount === 0) {
      warnings.push('Folder overrides/ jest pusty (brak dodatkowych plików konfiguracyjnych).');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      manifest: {
        formatVersion: manifest.formatVersion,
        game: manifest.game,
        name: manifest.name,
        versionId: manifest.versionId,
        filesCount: Array.isArray(manifest.files) ? manifest.files.length : 0,
        dependencies: manifest.dependencies || {},
        overridesCount,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      errors: [`Uszkodzone archiwum ZIP/.mrpack: ${err?.message || 'Błąd odczytu'}`],
      warnings,
    };
  }
}

export async function generateMrpackBlob(
  modpack: ModpackData,
  onProgress?: (msg: string, pct?: number) => void
): Promise<{ blob: Blob; report: ResolveReport; archiveCheck: ArchiveValidationResult }> {
  onProgress?.('Weryfikacja modów i zależności w Modrinth API...', 15);

  // 1. Resolve real Modrinth CDN URLs + SHA1/SHA512 hashes + loader version
  const report = await resolveRealModrinthFiles(modpack);

  if (report.unresolved.length > 0) {
    const names = report.unresolved.map((u) => `${u.name} (${u.reason})`).join('; ');
    throw new Error(`Nie można wyeksportować paczki z niezweryfikowanymi modami: ${names}`);
  }

  const allManifestFiles = [...report.files];

  // 2. Include verified Shaders & Resource Packs into Modrinth spec files[] (shaderpacks/ & resourcepacks/)
  const activeShaders = (modpack.shaders || []).filter((s) => s.enabled !== false);
  for (const shader of activeShaders) {
    if (shader.downloadUrl && shader.fileName && shader.hashes?.sha1 && shader.hashes?.sha512) {
      allManifestFiles.push({
        path: `shaderpacks/${shader.fileName}`,
        hashes: shader.hashes,
        env: { client: 'required', server: 'unsupported' },
        downloads: [shader.downloadUrl],
        fileSize: shader.fileSizeBytes || 0,
      });
    }
  }

  const activeResourcePacks = (modpack.resourcePacks || []).filter((r) => r.enabled !== false);
  for (const rp of activeResourcePacks) {
    if (rp.downloadUrl && rp.fileName && rp.hashes?.sha1 && rp.hashes?.sha512) {
      allManifestFiles.push({
        path: `resourcepacks/${rp.fileName}`,
        hashes: rp.hashes,
        env: { client: 'optional', server: 'unsupported' },
        downloads: [rp.downloadUrl],
        fileSize: rp.fileSizeBytes || 0,
      });
    }
  }

  onProgress?.(`Tworzenie manifestu modrinth.index.json (${allManifestFiles.length} plików)...`, 45);

  const zip = new JSZip();

  // 3. modrinth.index.json (Strict Modrinth Pack Spec v1)
  const indexContent = {
    formatVersion: 1,
    game: 'minecraft',
    versionId: modpack.version || '1.0.0',
    name: modpack.name,
    summary: modpack.summary || 'Paczka modów stworzona w CraftPack Studio',
    files: allManifestFiles,
    dependencies: report.dependencies,
  };

  zip.file('modrinth.index.json', JSON.stringify(indexContent, null, 2));

  // 4. Overrides folder: configs, questline SNBT, datapacks, and info report
  const overrides = zip.folder('overrides');
  if (overrides) {
    for (const cfg of modpack.configs) {
      overrides.file(cfg.path, cfg.content);
    }

    // Export QuestLine to FTB Quests SNBT inside overrides/config/ftbquests/
    if (modpack.questLine && modpack.questLine.chapters.length > 0) {
      const questFiles = exportQuestLineToSnbtFiles(modpack.questLine);
      for (const qf of questFiles) {
        overrides.file(qf.path, qf.content);
      }
    }

    // Bundle datapacks into overrides/datapacks/ via safe CDN proxy
    const activeDatapacks = (modpack.datapacks || []).filter((d) => d.enabled !== false);
    if (activeDatapacks.length > 0) {
      onProgress?.(`Pobieranie ${activeDatapacks.length} datapacków do overrides/datapacks/...`, 65);
      for (const dp of activeDatapacks) {
        if (dp.downloadUrl && dp.fileName) {
          try {
            const res = await fetch(`/api/fetch-cdn-binary?url=${encodeURIComponent(dp.downloadUrl)}`);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              overrides.file(`datapacks/${dp.fileName}`, buf);
            }
          } catch (e) {
            console.warn(`Could not inline datapack ${dp.name}:`, e);
          }
        }
      }
      overrides.file(
        'datapacks/README-DATAPACKS.txt',
        `Datapacki w folderze overrides/datapacks/ wymagają przypisania do świata lub użycia moda Global Packs / Paxi przy tworzeniu nowego świata.\nLista datapacków:\n${activeDatapacks.map((d) => `- ${d.name} (${d.fileName})`).join('\n')}\n`
      );
    }

    const loaderVerStr =
      report.dependencies['fabric-loader'] ||
      report.dependencies['neoforge'] ||
      report.dependencies['forge'] ||
      report.dependencies['quilt-loader'] ||
      '';

    const infoText = `CraftPack Studio - Raport Paczki Modyfikacji (.mrpack)
======================================================================
Nazwa paczki: ${modpack.name}
Wersja paczki: ${modpack.version}
Wersja Minecraft: ${modpack.mcVersion}
Modloader: ${modpack.loader.toUpperCase()} (${loaderVerStr})
Zalecana pamięć RAM: ${modpack.recommendedMemory}
Zalecenia dotyczące shaderów: ${modpack.shaderAdvice}

Zawartość archiwum:
· Mody pobierane z Modrinth CDN: ${report.files.length}
· Shadery (shaderpacks/): ${activeShaders.length}
· Resource Packi (resourcepacks/): ${activeResourcePacks.length}
· Datapacki (overrides/datapacks/): ${activeDatapacks.length}
· Pliki konfiguracyjne (overrides/config/): ${modpack.configs.length}
· Rozdziały questów (FTB Quests SNBT): ${modpack.questLine?.chapters.length || 0}

Lista modyfikacji:
${modpack.mods.map((m, idx) => `${idx + 1}. ${m.name} (${m.id}) [${m.version || 'latest'}]`).join('\n')}
`;
    overrides.file('craftpack-info.txt', infoText);
  }

  onProgress?.('Kompresja i końcowa walidacja archiwum .mrpack...', 85);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/x-modrinth-modpack+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // 5. Post-generation archive check
  const archiveCheck = await validateMrpackArchive(blob);
  if (!archiveCheck.valid) {
    throw new Error(`Wygenerowane archiwum nie przeszło walidacji: ${archiveCheck.errors.join('; ')}`);
  }

  onProgress?.('Gotowe!', 100);
  return { blob, report, archiveCheck };
}

export function downloadMrpack(modpack: ModpackData, blob: Blob): string {
  const safeName =
    modpack.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'craftpack';

  const fileName = `${safeName}-${modpack.version || '1.0.0'}.mrpack`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return fileName;
}
