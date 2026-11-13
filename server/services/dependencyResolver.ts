import {
  AddonItem,
  ModCategory,
  ModDependencyRef,
  ModItem,
  ModLoader,
} from '../../src/types/modpack';
import {
  getModrinthProject,
  getModrinthProjectsBatch,
  getModrinthProjectVersions,
  getModrinthVersion,
  ModrinthProject,
  ModrinthVersion,
  searchModrinthProjects,
  selectBestVersion,
} from './modrinthClient';
import { getLoaderVersions } from './loaderVersionService';

export interface DependencyResolutionResult {
  mods: ModItem[];
  addedLibraries: Array<{ id: string; projectId?: string; name: string; requiredBy: string }>;
  unresolved: Array<{ id: string; name: string; reason: string }>;
  incompatibleRefs: Array<{ modId: string; modName: string; conflictsWithId: string; conflictsWithName?: string }>;
  loaderVersion: string;
  loaderManifestKey: string;
  resolvedFiles: Array<{
    path: string;
    hashes: { sha1: string; sha512: string };
    env: { client: string; server: string };
    downloads: string[];
    fileSize: number;
  }>;
}

// Known slug aliases for convenience & cross-loader equivalence
const SLUG_ALIASES: Record<string, string> = {
  'better-dungeons': 'yungs-better-dungeons',
  'better-mineshafts': 'yungs-better-mineshafts',
  'better-strongholds': 'yungs-better-strongholds',
  'better-desert-temples': 'yungs-better-desert-temples',
  'better-nether-fortresses': 'yungs-better-nether-fortresses',
  'better-ocean-monuments': 'yungs-better-ocean-monuments',
  'better-witch-huts': 'yungs-better-witch-huts',
  'ferrite-core': 'ferrite-core',
  'ferritecore': 'ferrite-core',
  'rei': 'rei',
  'roughly-enough-items': 'rei',
  'jei': 'jei',
  'yungsapi': 'yungs-api',
  'playeranimator': 'playeranimator',
  'player-animator': 'playeranimator',
  'irons-spells-n-spellbooks': 'irons-spells-n-spellbooks',
  'trinkets': 'trinkets',
  'curios': 'curios',
};

function mapModrinthCategories(cats: string[] = []): ModCategory {
  const s = cats.map((c) => c.toLowerCase());
  if (s.includes('optimization')) return 'optimization';
  if (s.includes('library')) return 'library';
  if (s.includes('technology')) return 'technology';
  if (s.includes('magic')) return 'magic';
  if (s.includes('worldgen')) return 'worldgen';
  if (s.includes('adventure')) return 'adventure';
  if (s.includes('utility') || s.includes('equipment') || s.includes('storage')) return 'utility';
  if (s.includes('decoration') || s.includes('cursed')) return 'graphics';
  return 'gameplay';
}

function adaptSlugForLoader(slug: string, loader: ModLoader): string {
  const norm = slug.toLowerCase().trim();
  const aliased = SLUG_ALIASES[norm] || norm;

  if (loader === 'neoforge' || loader === 'forge') {
    if (aliased === 'trinkets') return 'curios';
    if (aliased === 'iris' && loader === 'forge') return 'oculus';
    if (aliased === 'sodium' && loader === 'forge') return 'embeddium';
  }
  if (loader === 'fabric' || loader === 'quilt') {
    if (aliased === 'curios') return 'trinkets';
    if (aliased === 'oculus') return 'iris';
    if (aliased === 'embeddium') return 'sodium';
  }
  if (loader === 'quilt' && aliased === 'fabric-api') {
    return 'qsl';
  }
  return aliased;
}

function getLoaderSearchCandidates(loader: ModLoader): string[] {
  // Quilt can load many Fabric mods alongside QSL/QFAPI
  if (loader === 'quilt') return ['quilt', 'fabric'];
  return [loader];
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function resolveProjectAndVersion(
  slugOrId: string,
  fallbackName: string,
  loader: ModLoader,
  mcVersion: string,
  preferRelease = true
): Promise<{ project: ModrinthProject; version: ModrinthVersion } | null> {
  const candidateLoaders = getLoaderSearchCandidates(loader);
  const adapted = adaptSlugForLoader(slugOrId, loader);

  let project = await getModrinthProject(adapted);
  if (!project && adapted !== slugOrId) {
    project = await getModrinthProject(slugOrId);
  }

  // Fallback search by name if direct slug failed
  if (!project && fallbackName) {
    for (const l of candidateLoaders) {
      const search = await searchModrinthProjects({
        query: fallbackName,
        projectType: 'mod',
        loader: l,
        mcVersion,
        limit: 3,
      });
      if (search.hits.length > 0) {
        project = await getModrinthProject(search.hits[0].project_id);
        if (project) break;
      }
    }
  }

  if (!project) return null;

  for (const l of candidateLoaders) {
    const versions = await getModrinthProjectVersions(project.id, {
      loaders: [l],
      gameVersions: [mcVersion],
    });
    const best = selectBestVersion(versions, preferRelease);
    if (best) {
      return { project, version: best };
    }
  }

  return null;
}

export async function resolveModpackDependencies(options: {
  mods: ModItem[];
  loader: ModLoader;
  mcVersion: string;
  preferRelease?: boolean;
  includeCoreLoaderApi?: boolean;
}): Promise<DependencyResolutionResult> {
  const {
    mods,
    loader,
    mcVersion,
    preferRelease = true,
    includeCoreLoaderApi = true,
  } = options;

  const loaderInfo = await getLoaderVersions(loader, mcVersion);

  const visitedProjectIds = new Set<string>();
  const resolvedModMap = new Map<string, ModItem>(); // projectId -> ModItem
  const addedLibraries: Array<{ id: string; projectId?: string; name: string; requiredBy: string }> = [];
  const unresolved: Array<{ id: string; name: string; reason: string }> = [];
  const incompatibleRefs: Array<{
    modId: string;
    modName: string;
    conflictsWithId: string;
    conflictsWithName?: string;
  }> = [];

  const queue: Array<{
    slugOrId: string;
    originalMod?: ModItem;
    requiredBy?: string;
    isAutoAdded: boolean;
  }> = [];

  const activeInputMods = mods.filter((m) => m.enabled !== false);

  // Inject Fabric API / QSL automatically when there are mods on Fabric/Quilt
  if (includeCoreLoaderApi && activeInputMods.length > 0) {
    const hasFabricApi = activeInputMods.some(
      (m) => m.id.toLowerCase() === 'fabric-api' || m.projectId === 'P7dR8mSH'
    );
    if (loader === 'fabric' && !hasFabricApi) {
      queue.push({
        slugOrId: 'fabric-api',
        requiredBy: 'Środowisko Fabric',
        isAutoAdded: true,
      });
    }
    const hasQsl = activeInputMods.some((m) => m.id.toLowerCase() === 'qsl');
    if (loader === 'quilt' && !hasQsl) {
      queue.push({
        slugOrId: 'qsl',
        requiredBy: 'Środowisko Quilt',
        isAutoAdded: true,
      });
    }
  }

  for (const mod of activeInputMods) {
    queue.push({
      slugOrId: mod.projectId || mod.id,
      originalMod: mod,
      isAutoAdded: false,
    });
  }

  // BFS recursive dependency traversal
  while (queue.length > 0) {
    const item = queue.shift()!;
    const lookupKey = item.slugOrId.trim();
    if (!lookupKey) continue;

    // Skip if already visited by projectId
    if (visitedProjectIds.has(lookupKey.toLowerCase())) {
      if (item.requiredBy) {
        const existing = resolvedModMap.get(lookupKey.toLowerCase());
        if (existing) {
          existing.requiredBy = Array.from(new Set([...(existing.requiredBy || []), item.requiredBy]));
        }
      }
      continue;
    }

    let resolved: { project: ModrinthProject; version: ModrinthVersion } | null = null;
    try {
      resolved = await resolveProjectAndVersion(
        lookupKey,
        item.originalMod?.name || lookupKey,
        loader,
        mcVersion,
        preferRelease
      );
    } catch (err: any) {
      unresolved.push({
        id: item.originalMod?.id || lookupKey,
        name: item.originalMod?.name || lookupKey,
        reason: err?.message || 'Błąd połączenia z Modrinth API',
      });
      continue;
    }

    if (!resolved) {
      // Check if project exists at all on Modrinth to give exact error cause
      const anyProject = await getModrinthProject(adaptSlugForLoader(lookupKey, loader)).catch(() => null);
      const reason = anyProject
        ? `Brak wydania kompatybilnego z ${loader.toUpperCase()} dla Minecraft ${mcVersion}`
        : `Nie znaleziono projektu "${lookupKey}" w bazie Modrinth`;

      unresolved.push({
        id: item.originalMod?.id || lookupKey,
        name: item.originalMod?.name || anyProject?.title || lookupKey,
        reason,
      });

      if (item.originalMod) {
        resolvedModMap.set(`unresolved:${item.originalMod.id.toLowerCase()}`, {
          ...item.originalMod,
          compatibilityStatus: 'incompatible',
          compatibilityNote: reason,
        });
      }
      continue;
    }

    const { project, version } = resolved;
    const projIdLower = project.id.toLowerCase();

    if (visitedProjectIds.has(projIdLower)) {
      if (item.requiredBy) {
        const existing = resolvedModMap.get(projIdLower);
        if (existing) {
          existing.requiredBy = Array.from(new Set([...(existing.requiredBy || []), item.requiredBy]));
        }
      }
      continue;
    }

    visitedProjectIds.add(projIdLower);
    visitedProjectIds.add(project.slug.toLowerCase());

    const primaryFile = version.files.find((f) => f.primary) || version.files[0];
    if (!primaryFile || !primaryFile.url || !primaryFile.hashes?.sha1) {
      unresolved.push({
        id: project.slug,
        name: project.title,
        reason: 'Wersja w Modrinth nie posiada prawidłowego pliku JAR ani sumy SHA-1',
      });
      continue;
    }

    // Fetch dependency project metadata in batch for rich UI display
    const depProjectIds = (version.dependencies || [])
      .map((d) => d.project_id)
      .filter((id): id is string => Boolean(id));
    const depProjects = await getModrinthProjectsBatch(depProjectIds);
    const depProjById = new Map(depProjects.map((p) => [p.id, p]));

    const resolvedDeps: ModDependencyRef[] = [];

    for (const dep of version.dependencies || []) {
      let depProjectId = dep.project_id;
      if (!depProjectId && dep.version_id) {
        const depVer = await getModrinthVersion(dep.version_id).catch(() => null);
        depProjectId = depVer?.project_id || null;
      }

      if (!depProjectId) continue;
      const depProj = depProjById.get(depProjectId) || (await getModrinthProject(depProjectId).catch(() => null));

      resolvedDeps.push({
        projectId: depProjectId,
        versionId: dep.version_id || undefined,
        slug: depProj?.slug,
        name: depProj?.title || depProjectId,
        dependencyType: dep.dependency_type,
      });

      if (dep.dependency_type === 'required') {
        if (!visitedProjectIds.has(depProjectId.toLowerCase())) {
          queue.push({
            slugOrId: depProjectId,
            requiredBy: project.title,
            isAutoAdded: true,
          });
        } else {
          const existing = resolvedModMap.get(depProjectId.toLowerCase());
          if (existing) {
            existing.requiredBy = Array.from(new Set([...(existing.requiredBy || []), project.title]));
          }
        }
      } else if (dep.dependency_type === 'incompatible') {
        incompatibleRefs.push({
          modId: project.slug,
          modName: project.title,
          conflictsWithId: depProj?.slug || depProjectId,
          conflictsWithName: depProj?.title,
        });
      }
    }

    const modEntry: ModItem = {
      id: project.slug,
      projectId: project.id,
      versionId: version.id,
      name: project.title,
      category: item.originalMod?.category || mapModrinthCategories(project.categories),
      description: item.originalMod?.description || project.description,
      reason:
        item.originalMod?.reason ||
        (item.isAutoAdded && item.requiredBy
          ? `Wymagana biblioteka automatycznie dodana dla: ${item.requiredBy}`
          : undefined),
      isCore:
        item.originalMod?.isCore ||
        project.categories.includes('library') ||
        item.isAutoAdded,
      isAutoAdded: item.isAutoAdded,
      locked: item.originalMod?.locked || false,
      loaders: version.loaders as ModLoader[],
      versions: version.game_versions,
      dependencies: resolvedDeps
        .filter((d) => d.dependencyType === 'required')
        .map((d) => d.slug || d.projectId),
      resolvedDependencies: resolvedDeps,
      requiredBy: item.requiredBy ? [item.requiredBy] : [],
      enabled: true,
      version: version.version_number,
      author: item.originalMod?.author || '',
      iconUrl: project.icon_url || item.originalMod?.iconUrl,
      downloads: project.downloads,
      modrinthUrl: `https://modrinth.com/mod/${project.slug}`,
      downloadUrl: primaryFile.url,
      fileName: primaryFile.filename,
      fileSize: formatBytes(primaryFile.size),
      fileSizeBytes: primaryFile.size,
      hashes: {
        sha1: primaryFile.hashes.sha1,
        sha512: primaryFile.hashes.sha512,
      },
      environment:
        project.client_side === 'required' && project.server_side === 'unsupported'
          ? 'client'
          : project.server_side === 'required' && project.client_side === 'unsupported'
            ? 'server'
            : 'both',
      compatibilityStatus: 'compatible',
      compatibilityNote: `Zweryfikowano w Modrinth: ${version.version_number} (${loader.toUpperCase()} ${mcVersion})`,
    };

    resolvedModMap.set(projIdLower, modEntry);

    if (item.isAutoAdded && item.requiredBy) {
      addedLibraries.push({
        id: project.slug,
        projectId: project.id,
        name: project.title,
        requiredBy: item.requiredBy,
      });
    }
  }

  // Keep disabled mods from input untouched (marked disabled)
  for (const disabledMod of mods.filter((m) => m.enabled === false)) {
    const key = `disabled:${disabledMod.id.toLowerCase()}`;
    if (!resolvedModMap.has(key)) {
      resolvedModMap.set(key, disabledMod);
    }
  }

  const finalMods = Array.from(resolvedModMap.values());
  const resolvedFiles = finalMods
    .filter(
      (m) =>
        m.enabled !== false &&
        m.compatibilityStatus === 'compatible' &&
        m.downloadUrl &&
        m.fileName &&
        m.hashes?.sha1 &&
        m.hashes?.sha512
    )
    .map((m) => ({
      path: `mods/${m.fileName}`,
      hashes: {
        sha1: m.hashes!.sha1,
        sha512: m.hashes!.sha512,
      },
      env: {
        client: 'required',
        server: m.environment === 'client' ? 'unsupported' : 'optional',
      },
      downloads: [m.downloadUrl!],
      fileSize: m.fileSizeBytes || 0,
    }));

  return {
    mods: finalMods,
    addedLibraries,
    unresolved,
    incompatibleRefs,
    loaderVersion: loaderInfo.recommended,
    loaderManifestKey: loaderInfo.manifestKey,
    resolvedFiles,
  };
}

export async function resolveAddonItem(
  slugOrId: string,
  type: 'shader' | 'resourcepack' | 'datapack',
  mcVersion: string,
  loader?: ModLoader
): Promise<AddonItem | null> {
  const project = await getModrinthProject(slugOrId);
  if (!project) return null;

  const versions = await getModrinthProjectVersions(project.id, {
    gameVersions: [mcVersion],
    loaders:
      type === 'shader'
        ? ['iris', 'optifine', 'canvas']
        : type === 'datapack'
          ? ['datapack', ...(loader ? [loader] : [])]
          : undefined,
  });

  // Fallback to all versions if strict MC version didn't match (many resourcepacks/shaders work across minor patches)
  const fallbackVersions =
    versions.length > 0 ? versions : await getModrinthProjectVersions(project.id);

  const best = selectBestVersion(fallbackVersions, true);
  if (!best) return null;
  const primaryFile = best.files.find((f) => f.primary) || best.files[0];
  if (!primaryFile) return null;

  return {
    id: project.slug,
    projectId: project.id,
    type,
    name: project.title,
    description: project.description,
    author: '',
    iconUrl: project.icon_url || undefined,
    galleryUrls: project.gallery?.map((g) => g.url).slice(0, 4) || [],
    downloads: project.downloads,
    versionId: best.id,
    versionNumber: best.version_number,
    fileName: primaryFile.filename,
    fileSizeBytes: primaryFile.size,
    downloadUrl: primaryFile.url,
    hashes: primaryFile.hashes,
    supportedVersions: best.game_versions,
    supportedLoaders: best.loaders,
    modrinthUrl: `https://modrinth.com/${type === 'resourcepack' ? 'resourcepack' : type === 'shader' ? 'shader' : 'datapack'}/${project.slug}`,
    enabled: true,
  };
}
