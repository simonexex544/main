export interface ModrinthSearchOptions {
  query?: string;
  projectType?: 'mod' | 'shader' | 'resourcepack' | 'datapack' | 'modpack';
  loader?: string;
  mcVersion?: string;
  categories?: string[];
  index?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated';
  limit?: number;
  offset?: number;
}

export interface ModrinthFile {
  hashes: {
    sha1: string;
    sha512: string;
  };
  url: string;
  filename: string;
  primary: boolean;
  size: number;
}

export interface ModrinthDependency {
  version_id: string | null;
  project_id: string | null;
  file_name: string | null;
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded';
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  version_type: 'release' | 'beta' | 'alpha';
  game_versions: string[];
  loaders: string[];
  files: ModrinthFile[];
  dependencies: ModrinthDependency[];
  date_published: string;
  downloads: number;
}

export interface ModrinthProject {
  id: string;
  slug: string;
  project_type: string;
  title: string;
  description: string;
  categories: string[];
  client_side: 'required' | 'optional' | 'unsupported' | 'unknown';
  server_side: 'required' | 'optional' | 'unsupported' | 'unknown';
  downloads: number;
  icon_url: string | null;
  gallery?: Array<{ url: string; title?: string; featured?: boolean }>;
  loaders: string[];
  game_versions: string[];
  source_url?: string | null;
  issues_url?: string | null;
}

export interface ModrinthSearchHit {
  project_id: string;
  project_type: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  versions: string[];
  downloads: number;
  follows: number;
  icon_url: string;
  latest_version: string;
  client_side: string;
  server_side: string;
  gallery?: string[];
}

const MODRINTH_API_BASE = 'https://api.modrinth.com/v2';
const USER_AGENT = 'CraftPack-Studio/2.0 (contact@craftpack.app)';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearModrinthCache(): void {
  cache.clear();
}

export async function modrinthFetch<T>(
  endpoint: string,
  retries = 3,
  timeoutMs = 12000
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${MODRINTH_API_BASE}${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After') || response.headers.get('X-Ratelimit-Reset');
        const waitSec = retryAfterHeader ? Math.min(Number(retryAfterHeader) || 2, 10) : 2 * (attempt + 1);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      if (response.status === 404) {
        throw new Error(`Modrinth 404 Not Found: ${endpoint}`);
      }

      if (!response.ok) {
        throw new Error(`Modrinth HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('404 Not Found')) {
        throw lastError;
      }
      if (attempt < retries) {
        const backoff = 350 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  throw lastError || new Error(`Failed Modrinth request: ${endpoint}`);
}

export async function searchModrinthProjects(options: ModrinthSearchOptions): Promise<{
  hits: ModrinthSearchHit[];
  total_hits: number;
  offset: number;
  limit: number;
}> {
  const {
    query = '',
    projectType = 'mod',
    loader,
    mcVersion,
    categories = [],
    index = 'relevance',
    limit = 20,
    offset = 0,
  } = options;

  const facets: string[][] = [[`project_type:${projectType}`]];
  if (loader && projectType === 'mod') {
    facets.push([`categories:${loader.toLowerCase()}`]);
  }
  if (mcVersion) {
    facets.push([`versions:${mcVersion}`]);
  }
  for (const cat of categories) {
    if (cat && cat !== 'all') {
      facets.push([`categories:${cat}`]);
    }
  }

  const params = new URLSearchParams({
    query: query.trim(),
    facets: JSON.stringify(facets),
    index,
    limit: String(Math.min(limit, 50)),
    offset: String(offset),
  });

  const endpoint = `/search?${params.toString()}`;
  const cacheKey = `search:${endpoint}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const data = await modrinthFetch<any>(endpoint);
  setCached(cacheKey, data, 5 * 60 * 1000);
  return data;
}

export async function getModrinthProject(idOrSlug: string): Promise<ModrinthProject | null> {
  const raw = idOrSlug.trim();
  if (!raw) return null;

  const cacheKey = `project:${raw.toLowerCase()}`;
  const cached = getCached<ModrinthProject | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const project = await modrinthFetch<ModrinthProject>(`/project/${encodeURIComponent(raw)}`);
    setCached(cacheKey, project);
    setCached(`project:${project.id.toLowerCase()}`, project);
    setCached(`project:${project.slug.toLowerCase()}`, project);
    return project;
  } catch (err: any) {
    if (err.message.includes('404')) {
      setCached(cacheKey, null, 2 * 60 * 1000);
      return null;
    }
    throw err;
  }
}

export async function getModrinthProjectsBatch(ids: string[]): Promise<ModrinthProject[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const results: ModrinthProject[] = [];
  const missing: string[] = [];

  for (const id of uniqueIds) {
    const cached = getCached<ModrinthProject | null>(`project:${id.toLowerCase()}`);
    if (cached) {
      results.push(cached);
    } else if (cached === undefined) {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(missing));
      const fetched = await modrinthFetch<ModrinthProject[]>(`/projects?ids=${encoded}`);
      for (const proj of fetched) {
        setCached(`project:${proj.id.toLowerCase()}`, proj);
        setCached(`project:${proj.slug.toLowerCase()}`, proj);
        results.push(proj);
      }
    } catch {
      // Fallback individually if batch fails
      for (const id of missing) {
        const p = await getModrinthProject(id).catch(() => null);
        if (p) results.push(p);
      }
    }
  }

  return results;
}

export async function getModrinthProjectVersions(
  idOrSlug: string,
  options?: { loaders?: string[]; gameVersions?: string[] }
): Promise<ModrinthVersion[]> {
  const raw = idOrSlug.trim();
  const params = new URLSearchParams();
  if (options?.loaders && options.loaders.length > 0) {
    params.set('loaders', JSON.stringify(options.loaders));
  }
  if (options?.gameVersions && options.gameVersions.length > 0) {
    params.set('game_versions', JSON.stringify(options.gameVersions));
  }

  const query = params.toString();
  const endpoint = `/project/${encodeURIComponent(raw)}/version${query ? `?${query}` : ''}`;
  const cacheKey = `versions:${endpoint.toLowerCase()}`;
  const cached = getCached<ModrinthVersion[]>(cacheKey);
  if (cached) return cached;

  try {
    const versions = await modrinthFetch<ModrinthVersion[]>(endpoint);
    setCached(cacheKey, versions);
    return versions;
  } catch (err: any) {
    if (err.message.includes('404')) {
      return [];
    }
    throw err;
  }
}

export async function getModrinthVersion(versionId: string): Promise<ModrinthVersion | null> {
  const cacheKey = `version:${versionId}`;
  const cached = getCached<ModrinthVersion | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const version = await modrinthFetch<ModrinthVersion>(`/version/${encodeURIComponent(versionId)}`);
    setCached(cacheKey, version);
    return version;
  } catch (err: any) {
    if (err.message.includes('404')) {
      setCached(cacheKey, null, 2 * 60 * 1000);
      return null;
    }
    throw err;
  }
}

export function selectBestVersion(
  versions: ModrinthVersion[],
  preferRelease = true
): ModrinthVersion | null {
  if (!Array.isArray(versions) || versions.length === 0) return null;

  const sorted = [...versions].sort((a, b) => {
    if (preferRelease) {
      const rank = (t: string) => (t === 'release' ? 0 : t === 'beta' ? 1 : 2);
      const rankDiff = rank(a.version_type) - rank(b.version_type);
      if (rankDiff !== 0) return rankDiff;
    }
    return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
  });

  // Ensure chosen version has a primary or first file with SHA1
  return sorted.find((v) => v.files && v.files.some((f) => f.url && f.hashes?.sha1)) || sorted[0];
}

export async function checkModrinthHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  try {
    const res = await fetch(`${MODRINTH_API_BASE}/tag/loader`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;
    return {
      ok: res.ok,
      latencyMs,
      message: res.ok ? 'Modrinth API v2 online' : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err?.message || 'Connection failed',
    };
  }
}
