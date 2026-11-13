import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModLoader } from './src/types/modpack';
import {
  checkModrinthHealth,
  clearModrinthCache,
  getModrinthProject,
  getModrinthProjectVersions,
  searchModrinthProjects,
} from './server/services/modrinthClient';
import { checkLoaderApisHealth, getLoaderVersions } from './server/services/loaderVersionService';
import { resolveAddonItem, resolveModpackDependencies } from './server/services/dependencyResolver';
import { validateModpack } from './server/services/validator';
import {
  generateQuestLineForPack,
  generateVerifiedModpackPlan,
  isAiConfigured,
} from './server/services/aiService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// 1. Service Health & API Diagnostics
app.get('/api/health', async (_req, res) => {
  try {
    const [modrinth, loaders] = await Promise.all([
      checkModrinthHealth(),
      checkLoaderApisHealth(),
    ]);
    return res.json({
      status: modrinth.ok ? 'online' : 'degraded',
      timestamp: new Date().toISOString(),
      modrinth,
      loaders,
      ai: {
        configured: isAiConfigured(),
        model: 'gemini-4-hydrogen',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Health check failed' });
  }
});

// 2. Clear Server Cache
app.post('/api/cache/clear', (_req, res) => {
  clearModrinthCache();
  return res.json({ success: true });
});

// 3. Modrinth Search (Mods, Shaders, Resource Packs, Datapacks)
app.get('/api/modrinth/search', async (req, res) => {
  try {
    const query = String(req.query.query || '');
    const projectType = (req.query.type as any) || 'mod';
    const loader = req.query.loader ? String(req.query.loader) : undefined;
    const mcVersion = req.query.mcVersion ? String(req.query.mcVersion) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const index = (req.query.index as any) || 'downloads';
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);

    const data = await searchModrinthProjects({
      query,
      projectType,
      loader,
      mcVersion,
      categories: category && category !== 'all' ? [category] : [],
      index,
      limit,
      offset,
    });

    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/modrinth/search:', err);
    return res.status(502).json({ error: err?.message || 'Błąd wyszukiwania w Modrinth API' });
  }
});

// 4. Modrinth Project + Compatible Versions Details
app.get('/api/modrinth/project/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const loader = req.query.loader ? String(req.query.loader) : undefined;
    const mcVersion = req.query.mcVersion ? String(req.query.mcVersion) : undefined;

    const project = await getModrinthProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Projekt nie znaleziony w Modrinth' });
    }

    const versions = await getModrinthProjectVersions(project.id, {
      loaders: loader ? [loader] : undefined,
      gameVersions: mcVersion ? [mcVersion] : undefined,
    });

    return res.json({ project, versions });
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'Błąd pobierania projektu' });
  }
});

// 5. Resolve Addon (Shader / Resource Pack / Datapack)
app.post('/api/modrinth/resolve-addon', async (req, res) => {
  try {
    const { slugOrId, type, mcVersion = '1.21.1', loader = 'fabric' } = req.body;
    if (!slugOrId || !type) {
      return res.status(400).json({ error: 'Wymagane pola slugOrId oraz type' });
    }
    const addon = await resolveAddonItem(slugOrId, type, mcVersion, loader);
    if (!addon) {
      return res.status(404).json({ error: `Nie znaleziono kompatybilnej wersji dla ${slugOrId}` });
    }
    return res.json({ addon });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Błąd rozwiązywania dodatku' });
  }
});

// 6. Live Loader Versions (Fabric / Forge / NeoForge / Quilt)
app.get('/api/loaders/versions', async (req, res) => {
  try {
    const loader = String(req.query.loader || 'fabric').toLowerCase() as ModLoader;
    const mcVersion = String(req.query.mcVersion || '1.21.1');
    const info = await getLoaderVersions(loader, mcVersion);
    return res.json(info);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Błąd pobierania wersji loadera' });
  }
});

// 7. Recursive Dependency Resolution
app.post('/api/resolve-dependencies', async (req, res) => {
  try {
    const {
      mods = [],
      loader = 'fabric',
      mcVersion = '1.21.1',
      preferRelease = true,
      includeCoreLoaderApi = true,
    } = req.body;

    const result = await resolveModpackDependencies({
      mods,
      loader,
      mcVersion,
      preferRelease,
      includeCoreLoaderApi,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/resolve-dependencies:', err);
    return res.status(500).json({ error: err?.message || 'Błąd rozwiązywania zależności' });
  }
});

// 8. Modrinth .mrpack File Resolution (preserved endpoint)
app.post('/api/resolve-mrpack-files', async (req, res) => {
  try {
    const { mods = [], loader = 'fabric', mcVersion = '1.21.1' } = req.body;
    const result = await resolveModpackDependencies({
      mods,
      loader,
      mcVersion,
      includeCoreLoaderApi: true,
    });

    return res.json({
      success: true,
      files: result.resolvedFiles,
      resolvedCount: result.resolvedFiles.length,
      totalCount: mods.length,
      unresolved: result.unresolved,
      addedLibraries: result.addedLibraries,
      resolvedMods: result.mods,
      dependencies: {
        minecraft: mcVersion,
        [result.loaderManifestKey]: result.loaderVersion,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/resolve-mrpack-files:', err);
    return res.status(500).json({ error: 'Błąd podczas rozwiązywania plików Modrinth' });
  }
});

// 9. Strict Modpack Validator
app.post('/api/validate-modpack', async (req, res) => {
  try {
    const { modpack, verifyOnline = true } = req.body;
    if (!modpack) {
      return res.status(400).json({ error: 'Brak danych modpacka do walidacji' });
    }
    const report = await validateModpack(modpack, { verifyOnline });
    return res.json(report);
  } catch (err: any) {
    console.error('Error in /api/validate-modpack:', err);
    return res.status(500).json({ error: err?.message || 'Błąd walidacji paczki' });
  }
});

// 10. Legacy Compatibility Check Endpoint
app.post('/api/check-conflicts', async (req, res) => {
  try {
    const { mods = [], loader = 'fabric', mcVersion = '1.21.1' } = req.body;
    const report = await validateModpack({ mods, loader, mcVersion, name: 'Check' }, { verifyOnline: true });

    const issues = report.items
      .filter((i) => i.status !== 'PASS')
      .map((i) => ({
        type: i.status === 'ERROR' ? ('error' as const) : ('warning' as const),
        title: i.title,
        message: i.message,
        autoFixModId: i.autoFix?.targetId,
        action: i.autoFix?.label,
      }));

    return res.json({
      status: report.overallStatus === 'ERROR' ? 'error' : report.overallStatus === 'WARNING' ? 'warning' : 'ok',
      totalMods: mods.length,
      loader,
      mcVersion,
      issues,
      aiInsights: `Loader ${loader.toUpperCase()} ${report.loaderVersion} · ${report.summary.passCount} PASS · ${report.summary.warningCount} WARNING · ${report.summary.errorCount} ERROR`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Błąd sprawdzania konfliktów' });
  }
});

// 11. AI Verified Modpack Architect
app.post('/api/ai/plan-modpack', async (req, res) => {
  try {
    const { prompt = '', loader = 'fabric', mcVersion = '1.21.1', settings = {} } = req.body;
    const plan = await generateVerifiedModpackPlan({
      prompt,
      loader,
      mcVersion,
      settings,
    });
    return res.json(plan);
  } catch (err: any) {
    console.error('Error in /api/ai/plan-modpack:', err);
    return res.status(500).json({ error: err?.message || 'Błąd kreatora AI' });
  }
});

// Backward compatible route alias
app.post('/api/generate-modpack', async (req, res) => {
  try {
    const { prompt = '', loader = 'fabric', mcVersion = '1.21.1', playstyle = 'survival_plus', memoryBudget = '6GB', includeShaders = true } = req.body;
    const plan = await generateVerifiedModpackPlan({
      prompt,
      loader,
      mcVersion,
      settings: {
        gameplayType: playstyle,
        targetRam: memoryBudget,
        includeShaders,
      },
    });
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Błąd generatora modpacka' });
  }
});

// 12. AI Questline Designer (Strictly Grounded in Installed Mods)
app.post('/api/ai/generate-quests', async (req, res) => {
  try {
    const { modpackName = 'CraftPack', loader = 'fabric', mcVersion = '1.21.1', installedMods = [], theme, chaptersCount } = req.body;
    const questLine = await generateQuestLineForPack({
      modpackName,
      loader,
      mcVersion,
      installedMods,
      theme,
      chaptersCount,
    });
    return res.json({ questLine });
  } catch (err: any) {
    console.error('Error in /api/ai/generate-quests:', err);
    return res.status(500).json({ error: err?.message || 'Błąd generowania questów' });
  }
});

// 13. Safe Modrinth CDN Proxy (strictly allowlisted to cdn.modrinth.com for datapack bundling into overrides)
app.get('/api/fetch-cdn-binary', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    if (!rawUrl.startsWith('https://cdn.modrinth.com/')) {
      return res.status(400).json({ error: 'Dozwolone są wyłącznie zasoby z https://cdn.modrinth.com/' });
    }
    const upstream = await fetch(rawUrl, {
      headers: { 'User-Agent': 'CraftPack-Studio/2.0 (contact@craftpack.app)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `CDN HTTP ${upstream.status}` });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Length', String(buf.length));
    return res.send(buf);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'Błąd pobierania pliku z CDN' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(port),
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`CraftPack Studio Server listening on port ${port}`);
  });
}

startServer();
