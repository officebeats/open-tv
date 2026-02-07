/**
 * Centralized application state management.
 * Uses immutable patterns with BehaviorSubject for reactive updates.
 * 
 * @example
 * // Reading state
 * const sources = this.appState.sources$.value;
 * 
 * // Updating state
 * this.appState.setSources(new Map([...]));
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Source } from '../../models/source';
import { Settings } from '../../models/settings';
import { SortType } from '../../models/sortType';
import { SetNodeDTO } from '../../models/setNodeDTO';

/** Immutable snapshot of app state */
export interface AppStateSnapshot {
  sources: Map<number, Source>;
  settings: Settings;
  loading: boolean;
  refreshing: boolean;
  refreshProgress: RefreshProgress;
}

export interface RefreshProgress {
  playlistName: string;
  activity: string;
  percent: number;
}

/**
 * Manages application-wide state with reactive streams.
 * Prefers BehaviorSubject for state that needs current value access,
 * and Subject for events that don't require replay.
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE STREAMS - Use these for reactive subscriptions
  // ═══════════════════════════════════════════════════════════════════════════

  /** Active playlist sources indexed by ID */
  readonly sources$ = new BehaviorSubject<Map<number, Source>>(new Map());

  /** Application settings */
  readonly settings$ = new BehaviorSubject<Settings>({});

  /** Global loading indicator */
  readonly loading$ = new BehaviorSubject<boolean>(false);

  /** Playlist refresh in progress */
  readonly refreshing$ = new BehaviorSubject<boolean>(false);

  /** Refresh progress details */
  readonly refreshProgress$ = new BehaviorSubject<RefreshProgress>({
    playlistName: '',
    activity: '',
    percent: 0,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT STREAMS - Fire-and-forget events
  // ═══════════════════════════════════════════════════════════════════════════

  /** Request to refresh channel list */
  readonly refreshChannels$ = new Subject<boolean>();

  /** Request to refresh sources */
  readonly refreshSources$ = new Subject<void>();

  /** Navigate to a node (category, series, season) */
  readonly navigateToNode$ = new Subject<SetNodeDTO>();

  /** Change sort order */
  readonly sortChange$ = new BehaviorSubject<[SortType, boolean]>([SortType.provider, false]);

  /** Toggle channel visibility */
  readonly toggleChannelVisibility$ = new Subject<boolean>();

  /** Focus a specific channel by index */
  readonly focusChannel$ = new Subject<number>();

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED STATE - Computed from other streams
  // ═══════════════════════════════════════════════════════════════════════════

  /** IDs of Xtream-type sources */
  get xtreamSourceIds(): Set<number> {
    const ids = new Set<number>();
    for (const [id, source] of this.sources$.value) {
      if (source.source_type === 2) ids.add(id); // SourceType.Xtream = 2
    }
    return ids;
  }

  /** IDs of Custom-type sources */
  get customSourceIds(): Set<number> {
    const ids = new Set<number>();
    for (const [id, source] of this.sources$.value) {
      if (source.source_type === 1) ids.add(id); // SourceType.Custom = 1
    }
    return ids;
  }

  /** Whether any Xtream sources exist */
  get hasXtreamSources(): boolean {
    return this.xtreamSourceIds.size > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MUTATORS - Use these to update state
  // ═══════════════════════════════════════════════════════════════════════════

  setSources(sources: Map<number, Source>): void {
    this.sources$.next(sources);
  }

  updateSettings(settings: Partial<Settings>): void {
    this.settings$.next({ ...this.settings$.value, ...settings });
  }

  setLoading(loading: boolean): void {
    this.loading$.next(loading);
  }

  setRefreshing(refreshing: boolean, progress?: Partial<RefreshProgress>): void {
    this.refreshing$.next(refreshing);
    if (progress) {
      this.refreshProgress$.next({ ...this.refreshProgress$.value, ...progress });
    }
    if (!refreshing) {
      // Reset progress when refresh completes
      this.refreshProgress$.next({ playlistName: '', activity: '', percent: 0 });
    }
  }

  updateRefreshProgress(progress: Partial<RefreshProgress>): void {
    this.refreshProgress$.next({ ...this.refreshProgress$.value, ...progress });
  }

  /** Get current snapshot of all state */
  getSnapshot(): AppStateSnapshot {
    return {
      sources: this.sources$.value,
      settings: this.settings$.value,
      loading: this.loading$.value,
      refreshing: this.refreshing$.value,
      refreshProgress: this.refreshProgress$.value,
    };
  }
}
