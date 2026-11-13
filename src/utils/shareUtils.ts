import { ModpackData } from '../types/modpack';

export function encodeModpackToUrl(pack: ModpackData): string {
  try {
    const minified = {
      n: pack.name,
      s: pack.summary,
      v: pack.version,
      l: pack.loader,
      lv: pack.loaderVersion,
      mc: pack.mcVersion,
      m: pack.mods.map((m) => ({
        id: m.id,
        n: m.name,
        c: m.category,
        d: m.description,
        e: m.enabled !== false,
        r: m.reason,
      })),
      c: pack.configs.map((cfg) => ({
        p: cfg.path,
        c: cfg.content,
        d: cfg.description,
      })),
      sh: (pack.shaders || []).map((s) => ({ id: s.id, n: s.name, pid: s.projectId })),
      rp: (pack.resourcePacks || []).map((r) => ({ id: r.id, n: r.name, pid: r.projectId })),
      dp: (pack.datapacks || []).map((d) => ({ id: d.id, n: d.name, pid: d.projectId })),
      rm: pack.recommendedMemory,
      sa: pack.shaderAdvice,
      ch: pack.changelog,
    };

    const json = JSON.stringify(minified);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    const url = new URL(window.location.origin + window.location.pathname);
    url.hash = `pack=${encodeURIComponent(b64)}`;
    return url.toString();
  } catch (e) {
    console.error('Failed to encode modpack:', e);
    return window.location.href;
  }
}

export function decodeModpackFromUrl(): ModpackData | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('pack=')) return null;

    const match = hash.match(/pack=([^&]+)/);
    if (!match || !match[1]) return null;

    const b64 = decodeURIComponent(match[1]);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const raw = JSON.parse(json);

    return {
      name: raw.n || 'Udostępniona Paczka CraftPack',
      summary: raw.s || '',
      version: raw.v || '1.0.0',
      author: 'Udostępniono przez CraftPack Studio',
      loader: raw.l || 'fabric',
      loaderVersion: raw.lv,
      mcVersion: raw.mc || '1.21.1',
      recommendedMemory: raw.rm || '6GB',
      shaderAdvice: raw.sa || '',
      changelog: raw.ch || ['Paczka zaimportowana ze współdzielonego linku.'],
      mods: (raw.m || []).map((m: any) => ({
        id: m.id,
        name: m.n || m.id,
        category: m.c || 'utility',
        description: m.d || '',
        enabled: m.e !== false,
        reason: m.r,
      })),
      configs: (raw.c || []).map((cfg: any) => ({
        path: cfg.p,
        content: cfg.c,
        description: cfg.d || '',
      })),
      shaders: (raw.sh || []).map((s: any) => ({
        id: s.id,
        projectId: s.pid || s.id,
        type: 'shader' as const,
        name: s.n || s.id,
        description: '',
        author: '',
        enabled: true,
      })),
      resourcePacks: (raw.rp || []).map((r: any) => ({
        id: r.id,
        projectId: r.pid || r.id,
        type: 'resourcepack' as const,
        name: r.n || r.id,
        description: '',
        author: '',
        enabled: true,
      })),
      datapacks: (raw.dp || []).map((d: any) => ({
        id: d.id,
        projectId: d.pid || d.id,
        type: 'datapack' as const,
        name: d.n || d.id,
        description: '',
        author: '',
        enabled: true,
      })),
    };
  } catch (e) {
    console.error('Failed to decode modpack from URL hash:', e);
    return null;
  }
}
