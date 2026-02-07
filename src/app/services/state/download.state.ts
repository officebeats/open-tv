/**
 * Manages download state for channels.
 * Tracks active downloads and their progress with reactive streams.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

interface DownloadState {
  progress: number;
  completed$: Subject<boolean>;
}

/**
 * Centralized download state management.
 * Tracks active downloads and provides progress updates.
 */
@Injectable({ providedIn: 'root' })
export class DownloadStateService {
  private downloads = new Map<number, DownloadState>();

  /** Check if a download exists for the given channel ID */
  hasDownload(channelId: number): boolean {
    return this.downloads.has(channelId);
  }

  /** Get download progress for a channel (0-100) */
  getProgress(channelId: number): number {
    return this.downloads.get(channelId)?.progress ?? 0;
  }

  /** Get the completion observable for a download */
  getCompletionObservable(channelId: number): Subject<boolean> | undefined {
    return this.downloads.get(channelId)?.completed$;
  }

  /** Start tracking a new download */
  startDownload(channelId: number): void {
    if (this.downloads.has(channelId)) return;

    this.downloads.set(channelId, {
      progress: 0,
      completed$: new Subject<boolean>(),
    });
  }

  /** Update download progress */
  updateProgress(channelId: number, progress: number): void {
    const download = this.downloads.get(channelId);
    if (download) {
      download.progress = Math.min(100, Math.max(0, progress));
    }
  }

  /** Mark download as complete and clean up */
  completeDownload(channelId: number): void {
    const download = this.downloads.get(channelId);
    if (download) {
      download.completed$.next(true);
      download.completed$.complete();
      this.downloads.delete(channelId);
    }
  }

  /** Cancel and remove a download */
  cancelDownload(channelId: number): void {
    const download = this.downloads.get(channelId);
    if (download) {
      download.completed$.next(false);
      download.completed$.complete();
      this.downloads.delete(channelId);
    }
  }

  /** Get all active download IDs */
  getActiveDownloadIds(): number[] {
    return Array.from(this.downloads.keys());
  }

  /** Clear all downloads */
  clearAll(): void {
    for (const [id, download] of this.downloads) {
      download.completed$.complete();
    }
    this.downloads.clear();
  }
}
