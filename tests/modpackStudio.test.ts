import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { getLoaderVersions, compareSemver } from '../server/services/loaderVersionService';
import { resolveModpackDependencies } from '../server/services/dependencyResolver';
import { validateModpack } from '../server/services/validator';
import { validateMrpackArchive } from '../src/utils/mrpackGenerator';
import { exportQuestLineToSnbtFiles } from '../src/utils/questExporter';
import {
  createEmptyModpack,
  createProjectFromData,
  exportAllProjectsBackup,
  parseProjectsBackupJson,
} from '../src/services/projectStorage';
import { ModItem, ModpackProject } from '../src/types/modpack';

describe('CraftPack Studio - Core & .mrpack Integration Suite', () => {
  // Test 1: Tworzenie pustego modpacka
  it('1. creates and validates an empty modpack cleanly', async () => {
    const emptyPack = createEmptyModpack({
      name: 'Pusty Profil Testowy',
      loader: 'fabric',
      mcVersion: '1.21.1',
    });

    expect(emptyPack.mods).toHaveLength(0);
    expect(emptyPack.loader).toBe('fabric');
    expect(emptyPack.mcVersion).toBe('1.21.1');

    const report = await validateModpack(emptyPack, { verifyOnline: false });
    expect(report.overallStatus).toBe('WARNING'); // 0 mods warning, NOT error
    expect(report.canExport).toBe(true);
  });

  // Test 2: Tworzenie modpacka Fabric
  it('2. resolves Fabric loader version and core Fabric mods', async () => {
    const loaderInfo = await getLoaderVersions('fabric', '1.21.1');
    expect(loaderInfo.manifestKey).toBe('fabric-loader');
    expect(loaderInfo.recommended).toBeTruthy();

    const mods: ModItem[] = [
      { id: 'sodium', name: 'Sodium', category: 'optimization', description: 'FPS', enabled: true },
    ];
    const resolved = await resolveModpackDependencies({
      mods,
      loader: 'fabric',
      mcVersion: '1.21.1',
    });

    expect(resolved.unresolved).toHaveLength(0);
    expect(resolved.mods.some((m) => m.id === 'sodium')).toBe(true);
    expect(resolved.mods.some((m) => m.id === 'fabric-api')).toBe(true);
    expect(resolved.resolvedFiles.every((f) => f.downloads[0].startsWith('https://cdn.modrinth.com/'))).toBe(true);
  }, 20000);

  // Test 3: Tworzenie modpacka Forge
  it('3. resolves Forge loader version and Forge-compatible mods', async () => {
    const loaderInfo = await getLoaderVersions('forge', '1.20.1');
    expect(loaderInfo.manifestKey).toBe('forge');
    expect(loaderInfo.recommended).toMatch(/^47\./);

    const mods: ModItem[] = [
      { id: 'embeddium', name: 'Embeddium', category: 'optimization', description: 'FPS', enabled: true },
    ];
    const resolved = await resolveModpackDependencies({
      mods,
      loader: 'forge',
      mcVersion: '1.20.1',
    });

    expect(resolved.unresolved).toHaveLength(0);
    expect(resolved.loaderManifestKey).toBe('forge');
    expect(resolved.mods.some((m) => m.id === 'embeddium')).toBe(true);
    // Forge pack must NOT inject Fabric API
    expect(resolved.mods.some((m) => m.id === 'fabric-api')).toBe(false);
  }, 20000);

  // Test 4: Tworzenie modpacka NeoForge (fix stale 21.1.72 crash report!)
  it('4. fetches live NeoForge >= 21.1.219 for MC 1.21.1 and detects stale 21.1.72', async () => {
    const loaderInfo = await getLoaderVersions('neoforge', '1.21.1');
    expect(loaderInfo.manifestKey).toBe('neoforge');
    expect(compareSemver(loaderInfo.recommended, '21.1.219')).toBeGreaterThanOrEqual(0);

    // Verify validator catches stale 21.1.72 from user crash report
    const staleReport = await validateModpack(
      {
        name: 'Stale NeoForge Test',
        loader: 'neoforge',
        loaderVersion: '21.1.72',
        mcVersion: '1.21.1',
        mods: [
          { id: 'sodium', name: 'Sodium', category: 'optimization', description: '', enabled: true },
          { id: 'ferrite-core', name: 'FerriteCore', category: 'optimization', description: '', enabled: true },
        ],
      },
      { verifyOnline: false }
    );
    expect(staleReport.overallStatus).toBe('ERROR');
    expect(staleReport.canExport).toBe(false);
    expect(staleReport.items.some((i) => i.id === 'neoforge_too_old')).toBe(true);
  }, 20000);

  // Test 5 & 6: Dodawanie moda z zależnościami i automatyczne dodawanie wymaganych bibliotek
  it('5 & 6. recursively auto-adds required Modrinth libraries (Terralith->Lithostitched, Waystones->Balm, YUNGs->YUNGs API)', async () => {
    const mods: ModItem[] = [
      { id: 'terralith', name: 'Terralith', category: 'worldgen', description: 'Biomes', enabled: true },
      { id: 'waystones', name: 'Waystones', category: 'gameplay', description: 'Teleport', enabled: true },
      { id: 'yungs-better-mineshafts', name: "YUNG's Better Mineshafts", category: 'worldgen', description: 'Mines', enabled: true },
    ];

    const resolved = await resolveModpackDependencies({
      mods,
      loader: 'neoforge',
      mcVersion: '1.21.1',
    });

    expect(resolved.unresolved).toHaveLength(0);
    const resolvedSlugs = new Set(resolved.mods.map((m) => m.id.toLowerCase()));
    expect(resolvedSlugs.has('lithostitched')).toBe(true);
    expect(resolvedSlugs.has('balm')).toBe(true);
    expect(resolvedSlugs.has('yungs-api')).toBe(true);
    expect(resolved.addedLibraries.length).toBeGreaterThanOrEqual(3);
  }, 30000);

  // Test 7: Wykrywanie niekompatybilnych modów
  it('7. detects incompatible mods (OptiFine + Sodium, Fabric API on NeoForge) and blocks export', async () => {
    const report = await validateModpack(
      {
        name: 'Broken Pack',
        loader: 'neoforge',
        loaderVersion: '21.1.266',
        mcVersion: '1.21.1',
        mods: [
          { id: 'sodium', name: 'Sodium', category: 'optimization', description: '', enabled: true },
          { id: 'optifine', name: 'OptiFine', category: 'graphics', description: '', enabled: true },
          { id: 'fabric-api', name: 'Fabric API', category: 'library', description: '', enabled: true },
        ],
      },
      { verifyOnline: false }
    );

    expect(report.overallStatus).toBe('ERROR');
    expect(report.canExport).toBe(false);
    expect(report.items.some((i) => i.id === 'conflict_optifine')).toBe(true);
    expect(report.items.some((i) => i.id === 'fabric_api_wrong_loader')).toBe(true);
  });

  // Test 8 & 10: Generowanie pliku .mrpack + eksport i walidacja archiwum
  it('8 & 10. generates valid .mrpack archive with modrinth.index.json, overrides, FTB Quests SNBT and passes archive validation', async () => {
    const resolved = await resolveModpackDependencies({
      mods: [
        { id: 'sodium', name: 'Sodium', category: 'optimization', description: 'FPS', enabled: true },
        { id: 'waystones', name: 'Waystones', category: 'gameplay', description: 'Waystones', enabled: true },
      ],
      loader: 'neoforge',
      mcVersion: '1.21.1',
    });

    const zip = new JSZip();
    const index = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: '1.0.0',
      name: 'Archive Validation Test Pack',
      summary: 'Test summary',
      files: resolved.resolvedFiles,
      dependencies: {
        minecraft: '1.21.1',
        [resolved.loaderManifestKey]: resolved.loaderVersion,
      },
    };
    zip.file('modrinth.index.json', JSON.stringify(index, null, 2));

    const overrides = zip.folder('overrides')!;
    overrides.file('config/test.json', '{"ok":true}');

    const snbtFiles = exportQuestLineToSnbtFiles({
      id: 'ql_test',
      title: 'Test Quests',
      storyPremise: 'Test',
      generatedAt: new Date().toISOString(),
      ftbQuestsCompatible: true,
      ftbCompatibilityNote: 'OK',
      chapters: [
        {
          id: 'ch_1',
          title: 'Chapter 1',
          subtitle: 'Start',
          iconItem: 'minecraft:book',
          order: 0,
          quests: [
            {
              id: 'q1',
              title: 'First Waystone',
              description: 'Craft a waystone',
              isSideQuest: false,
              iconItem: 'waystones:waystone',
              modId: 'waystones',
              dependencies: [],
              objectives: [
                {
                  id: 'o1',
                  type: 'checkmark',
                  title: 'Done',
                  target: 'waystones:waystone',
                  count: 1,
                  modId: 'waystones',
                },
              ],
              rewards: [{ id: 'r1', type: 'xp', title: '50 XP', xp: 50 }],
              x: 0,
              y: 0,
            },
          ],
        },
      ],
    });
    for (const qf of snbtFiles) {
      overrides.file(qf.path, qf.content);
    }

    const buffer = await zip.generateAsync({ type: 'uint8array' });
    const validation = await validateMrpackArchive(buffer);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.manifest?.formatVersion).toBe(1);
    expect(validation.manifest?.dependencies.neoforge).toBeTruthy();
    expect(validation.manifest?.filesCount).toBeGreaterThanOrEqual(3); // sodium, waystones, balm
    expect(validation.manifest?.overridesCount).toBeGreaterThanOrEqual(3); // config + ch_1.snbt + data.snbt
  }, 25000);

  // Test 9: Zapis i ponowne otwarcie projektu
  it('9. persists and reloads project library backup JSON cleanly', () => {
    const proj: ModpackProject = createProjectFromData({
      name: 'Roundtrip Project',
      summary: 'Serialization test',
      version: '1.2.0',
      author: 'Tester',
      loader: 'quilt',
      loaderVersion: '0.28.1',
      mcVersion: '1.21.1',
      recommendedMemory: '6GB',
      shaderAdvice: 'Iris',
      mods: [
        { id: 'sodium', name: 'Sodium', category: 'optimization', description: 'FPS', enabled: true },
      ],
      configs: [{ path: 'config/a.json', content: '{}', description: 'A' }],
      changelog: ['v1.2.0'],
    });

    const json = exportAllProjectsBackup([proj]);
    const restored = parseProjectsBackupJson(json);

    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Roundtrip Project');
    expect(restored[0].loader).toBe('quilt');
    expect(restored[0].mods[0].id).toBe('sodium');
  });
});
