import { ModLoader } from '../../src/types/modpack';

export interface LoaderVersionInfo {
  loader: ModLoader;
  mcVersion: string;
  recommended: string;
  versions: string[];
  source: 'live_api' | 'fallback';
  manifestKey: 'fabric-loader' | 'forge' | 'neoforge' | 'quilt-loader';
}

interface CacheEntry {
  data: LoaderVersionInfo;
  expiresAt: number;
}

const loaderCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const FALLBACK_LOADER_VERSIONS: Record<ModLoader, Record<string, string>> = {
  fabric: {
    '1.21.4': '0.16.10',
    '1.21.3': '0.16.10',
    '1.21.1': '0.16.10',
    '1.21': '0.16.10',
    '1.20.6': '0.16.10',
    '1.20.4': '0.16.10',
    '1.20.1': '0.16.10',
  },
  neoforge: {
    '1.21.4': '21.4.123-beta',
    '1.21.3': '21.3.66',
    '1.21.1': '21.1.266',
    '1.21': '21.0.167',
    '1.20.6': '20.6.134',
    '1.20.4': '20.4.250',
    '1.20.1': '47.1.106',
  },
  forge: {
    '1.21.4': '54.1.0',
    '1.21.3': '53.0.31',
    '1.21.1': '52.1.0',
    '1.21': '51.0.33',
    '1.20.6': '50.1.32',
    '1.20.4': '49.2.0',
    '1.20.1': '47.4.28',
  },
  quilt: {
    '1.21.4': '0.28.1',
    '1.21.1': '0.28.1',
    '1.20.4': '0.28.1',
    '1.20.1': '0.28.1',
  },
};

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

export function compareSemver(a: string, b: string): number {
  const clean = (v: string) =>
    v
      .replace(/[^0-9.]/g, ' ')
      .trim()
      .split(/\s+/)[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const pa = clean(a);
  const pb = clean(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  // Prefer stable without -beta/-alpha suffix when numeric parts match
  const aBeta = /alpha|beta|rc/i.test(a) ? 1 : 0;
  const bBeta = /alpha|beta|rc/i.test(b) ? 1 : 0;
  return bBeta - aBeta;
}

function getNeoForgePrefixForMc(mcVersion: string): string {
  // NeoForge uses <minor>.<patch> of MC 1.<minor>.<patch>
  // e.g. 1.21.1 -> "21.1.", 1.21 -> "21.0.", 1.21.4 -> "21.4.", 1.20.4 -> "20.4.", 1.20.1 -> "47.1."
  if (mcVersion === '1.20.1') return '47.1.';
  const parts = mcVersion.split('.');
  const minor = parts[1] || '21';
  const patch = parts[2] || '0';
  return `${minor}.${patch}.`;
}

async function fetchFabricVersions(mcVersion: string): Promise<string[]> {
  const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`, {
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Fabric Meta HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ loader: { version: string; stable: boolean } }>;
  const stable = data.filter((d) => d.loader?.stable).map((d) => d.loader.version);
  const all = data.map((d) => d.loader?.version).filter(Boolean);
  return stable.length > 0 ? stable : all;
}

async function fetchQuiltVersions(mcVersion: string): Promise<string[]> {
  const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`, {
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Quilt Meta HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ loader: { version: string } }>;
  const all = data.map((d) => d.loader?.version).filter(Boolean);
  const nonBeta = all.filter((v) => !/beta|alpha/i.test(v));
  return nonBeta.length > 0 ? nonBeta : all;
}

async function fetchNeoForgeVersions(mcVersion: string): Promise<string[]> {
  const res = await fetch(
    'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml',
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`NeoForge Maven HTTP ${res.status}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1]);
  const prefix = getNeoForgePrefixForMc(mcVersion);
  const matching = matches.filter((v) => v.startsWith(prefix));
  const stable = matching.filter((v) => !/beta|alpha|snapshot/i.test(v));
  const list = (stable.length > 0 ? stable : matching).sort((a, b) => compareSemver(b, a));
  return list;
}

async function fetchForgeVersions(mcVersion: string): Promise<string[]> {
  const res = await fetch(
    'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
    { signal: AbortSignal.timeout(7000) }
  );
  if (!res.ok) throw new Error(`Forge Promotions HTTP ${res.status}`);
  const data = (await res.json()) as { promos?: Record<string, string> };
  const promos = data.promos || {};
  const recommended = promos[`${mcVersion}-recommended`];
  const latest = promos[`${mcVersion}-latest`];
  const result = [latest, recommended].filter(Boolean) as string[];
  return Array.from(new Set(result));
}

export async function getLoaderVersions(
  loader: ModLoader,
  mcVersion: string
): Promise<LoaderVersionInfo> {
  const normLoader = (loader || 'fabric').toLowerCase() as ModLoader;
  const cacheKey = `${normLoader}:${mcVersion}`;
  const cached = loaderCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const manifestKey = getLoaderManifestKey(normLoader);
  let versions: string[] = [];
  let source: 'live_api' | 'fallback' = 'live_api';

  try {
    if (normLoader === 'fabric') {
      versions = await fetchFabricVersions(mcVersion);
    } else if (normLoader === 'quilt') {
      versions = await fetchQuiltVersions(mcVersion);
    } else if (normLoader === 'neoforge') {
      versions = await fetchNeoForgeVersions(mcVersion);
    } else if (normLoader === 'forge') {
      versions = await fetchForgeVersions(mcVersion);
    }
  } catch (err) {
    console.warn(`Live loader lookup failed for ${normLoader} ${mcVersion}:`, err);
    source = 'fallback';
  }

  if (versions.length === 0) {
    source = 'fallback';
    const fb =
      FALLBACK_LOADER_VERSIONS[normLoader]?.[mcVersion] ||
      Object.values(FALLBACK_LOADER_VERSIONS[normLoader] || {})[0] ||
      '0.16.10';
    versions = [fb];
  }

  const info: LoaderVersionInfo = {
    loader: normLoader,
    mcVersion,
    recommended: versions[0],
    versions: versions.slice(0, 15),
    source,
    manifestKey,
  };

  loaderCache.set(cacheKey, { data: info, expiresAt: Date.now() + CACHE_TTL_MS });
  return info;
}

export async function checkLoaderApisHealth(): Promise<
  Record<ModLoader, { ok: boolean; sampleVersion?: string }>
> {
  const [fabric, neoforge, forge, quilt] = await Promise.all([
    getLoaderVersions('fabric', '1.21.1'),
    getLoaderVersions('neoforge', '1.21.1'),
    getLoaderVersions('forge', '1.20.1'),
    getLoaderVersions('quilt', '1.21.1'),
  ]);

  return {
    fabric: { ok: fabric.source === 'live_api', sampleVersion: fabric.recommended },
    neoforge: { ok: neoforge.source === 'live_api', sampleVersion: neoforge.recommended },
    forge: { ok: forge.source === 'live_api', sampleVersion: forge.recommended },
    quilt: { ok: quilt.source === 'live_api', sampleVersion: quilt.recommended },
  };
}
