import { DownloadTask } from '../types/modpack';
import { addLog } from './logger';

type Listener = (tasks: DownloadTask[]) => void;

class DownloadManagerService {
  private tasks: DownloadTask[] = [];
  private listeners = new Set<Listener>();

  getTasks(): DownloadTask[] {
    return this.tasks;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snapshot = [...this.tasks];
    this.listeners.forEach((fn) => fn(snapshot));
  }

  createTask(params: {
    fileName: string;
    itemType: DownloadTask['itemType'];
    totalBytes?: number;
    url?: string;
    sha1?: string;
  }): DownloadTask {
    const task: DownloadTask = {
      id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fileName: params.fileName,
      itemType: params.itemType,
      progress: 0,
      speedBytesPerSec: 0,
      totalBytes: params.totalBytes || 0,
      downloadedBytes: 0,
      status: 'queued',
      retries: 0,
      url: params.url,
      sha1: params.sha1,
      createdAt: new Date().toLocaleTimeString('pl-PL'),
    };
    this.tasks = [task, ...this.tasks].slice(0, 100);
    this.emit();
    return task;
  }

  updateTask(id: string, patch: Partial<DownloadTask>): void {
    this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    this.emit();
  }

  clearCompleted(): void {
    this.tasks = this.tasks.filter((t) => t.status !== 'completed');
    this.emit();
  }

  async runDownloadWithProgress(
    taskId: string,
    fetcher: (onProgress: (loaded: number, total: number, speed: number) => void) => Promise<Blob | void>
  ): Promise<Blob | void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.updateTask(taskId, { status: 'downloading', error: undefined, progress: 5 });

    try {
      const result = await fetcher((loaded, total, speed) => {
        const pct = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 50;
        this.updateTask(taskId, {
          status: 'downloading',
          downloadedBytes: loaded,
          totalBytes: total || task.totalBytes,
          progress: pct,
          speedBytesPerSec: speed,
        });
      });

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        speedBytesPerSec: 0,
      });
      addLog('info', 'Downloads', `Ukończono zadanie: ${task.fileName}`);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Nieznany błąd pobierania';
      this.updateTask(taskId, {
        status: 'failed',
        error: msg,
        speedBytesPerSec: 0,
      });
      addLog('error', 'Downloads', `Błąd pobierania ${task.fileName}: ${msg}`);
      throw err;
    }
  }

  async retryTask(id: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task || !task.url) return;

    this.updateTask(id, {
      status: 'downloading',
      error: undefined,
      retries: task.retries + 1,
      progress: 10,
    });

    try {
      const proxyUrl = task.url.startsWith('https://cdn.modrinth.com/')
        ? `/api/fetch-cdn-binary?url=${encodeURIComponent(task.url)}`
        : task.url;

      const start = Date.now();
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const elapsedSec = Math.max(0.1, (Date.now() - start) / 1000);
      const speed = Math.round(blob.size / elapsedSec);

      this.updateTask(id, {
        status: 'completed',
        progress: 100,
        downloadedBytes: blob.size,
        totalBytes: blob.size,
        speedBytesPerSec: speed,
      });

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = task.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);

      addLog('info', 'Downloads', `Ponowione pobieranie zakończone: ${task.fileName}`);
    } catch (err: any) {
      this.updateTask(id, {
        status: 'failed',
        error: err?.message || 'Ponowienie nie powiodło się',
      });
      addLog('error', 'Downloads', `Ponowienie nie powiodło się (${task.fileName}): ${err?.message}`);
    }
  }
}

export const downloadManager = new DownloadManagerService();
