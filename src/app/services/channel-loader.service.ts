import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel } from '../models/channel';
import { Filters } from '../models/filters';
import { MediaType } from '../models/mediaType';
import { ViewMode } from '../models/viewMode';
import { TauriService } from './tauri.service';
import { PlaylistService } from './playlist.service';
import { SettingsService } from './settings.service';
import { FilterService } from './filter.service';
import { MemoryService } from '../memory.service';
import { ToastrService } from 'ngx-toastr';

export interface ChannelLoadResult {
  channels: Channel[];
  reachedMax: boolean;
  fromCache: boolean;
}

/**
 * ChannelLoaderService
 *
 * Centralized service for loading channels from the backend.
 * Extracts data fetching logic from HomeComponent to improve separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelLoaderService {
  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private channelsSubject = new BehaviorSubject<Channel[]>([]);
  private reachedMaxSubject = new BehaviorSubject<boolean>(false);

  // Observables
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();
  public channels$: Observable<Channel[]> = this.channelsSubject.asObservable();
  public reachedMax$: Observable<boolean> = this.reachedMaxSubject.asObservable();

  // Constants
  readonly PAGE_SIZE = 36;

  constructor(
    private tauri: TauriService,
    private playlistService: PlaylistService,
    private settingsService: SettingsService,
    private filterService: FilterService,
    private memory: MemoryService,
    private toast: ToastrService,
  ) {}

  // ─── State Accessors ─────────────────────────────────────────────────────

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  set loading(value: boolean) {
    this.loadingSubject.next(value);
  }

  get channels(): Channel[] {
    return this.channelsSubject.value;
  }

  set channels(value: Channel[]) {
    this.channelsSubject.next(value);
  }

  get reachedMax(): boolean {
    return this.reachedMaxSubject.value;
  }

  set reachedMax(value: boolean) {
    this.reachedMaxSubject.next(value);
  }

  // ─── Channel Loading ──────────────────────────────────────────────────────

  /**
   * Load channels from the backend
   * @param filters Current filter state
   * @param more Whether this is a "load more" operation (pagination)
   * @returns Promise resolving to load result
   */
  async loadChannels(filters: Filters, more: boolean = false): Promise<ChannelLoadResult> {
    this.loading = true;

    // Update pagination
    if (more) {
      filters.page++;
    } else {
      filters.page = 1;
      this.channels = []; // Clear current channels for fresh load
    }

    // Ensure hidden filter is set
    filters.show_hidden = false;

    // If no media types are selected, return empty result immediately
    if (!filters.media_types || filters.media_types.length === 0) {
      this.channels = [];
      this.reachedMax = true;
      this.loading = false;
      return {
        channels: [],
        reachedMax: true,
        fromCache: false,
      };
    }

    try {
      let channels = await this.fetchChannels(filters);

      // Handle empty results with auto-refresh (only for 'All' view mode)
      if (
        !more &&
        channels.length === 0 &&
        !filters.query &&
        filters.view_type === ViewMode.All &&
        this.memory.Sources.size > 0
      ) {
        channels = await this.handleEmptyResults(filters);
      }

      // Handle fallback search for filtered queries
      if (!more && channels.length === 0 && filters.query && filters.media_types.length < 3) {
        channels = await this.handleFallbackSearch(filters);
      }

      // Process and store results
      const processedChannels = this.processChannels(channels, filters, more);
      this.channels = processedChannels;
      this.reachedMax = channels.length < this.PAGE_SIZE;

      return {
        channels: processedChannels,
        reachedMax: this.reachedMax,
        fromCache: false,
      };
    } catch (error) {
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Fetch channels from the backend
   */
  private async fetchChannels(filters: Filters): Promise<Channel[]> {
    return await this.tauri.call<Channel[]>('search', { filters });
  }

  /**
   * Handle empty results by triggering auto-refresh
   */
  private async handleEmptyResults(filters: Filters): Promise<Channel[]> {
    this.toast.info('Importing channels from your playlist...');

    try {
      await this.playlistService.refreshAll();
      this.memory.settings.last_refresh = Date.now();
      await this.settingsService.updateSettings(this.memory.settings);

      // Retry the search after refresh
      const channels = await this.fetchChannels(filters);

      if (channels.length > 0) {
        this.toast.success(`Successfully imported ${channels.length} channels!`);
      }

      return channels;
    } catch (refreshError) {
      this.toast.error('Failed to import channels. Please check your playlist settings.');
      throw refreshError;
    }
  }

  /**
   * Handle fallback search when filtered query returns no results
   */
  private async handleFallbackSearch(filters: Filters): Promise<Channel[]> {
    // Expand search to all types
    filters.media_types = [MediaType.livestream, MediaType.movie, MediaType.serie];

    // Sync filter state
    this.filterService.updateFilterState({
      chkLiveStream: true,
      chkMovie: true,
      chkSerie: true,
    });

    const channels = await this.fetchChannels(filters);

    if (channels.length > 0) {
      this.toast.info('No results in current category. Found matches in other areas!');
    }

    return channels;
  }

  /**
   * Process channels after loading
   */
  private processChannels(channels: Channel[], filters: Filters, more: boolean): Channel[] {
    // Apply smart sorting for category view
    const sortedChannels = this.filterService.sortChannelsSmart(
      channels,
      filters.view_type === this.filterService.filterState.currentViewType,
      !!filters.query,
    );

    // Filter visible channels
    const visibleChannels = sortedChannels.filter((c) => this.filterService.isChannelVisible(c));

    if (more) {
      // Append to existing channels
      return [...this.channels, ...visibleChannels];
    } else {
      // Replace existing channels
      return visibleChannels;
    }
  }

  // ─── Load More ────────────────────────────────────────────────────────────

  /**
   * Load more channels (pagination)
   */
  async loadMore(filters: Filters): Promise<ChannelLoadResult | null> {
    if (this.reachedMax || this.loading) {
      return null;
    }
    return await this.loadChannels(filters, true);
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  /**
   * Refresh all channels from sources
   */
  async refreshAll(reason: string = 'user requested'): Promise<void> {
    this.toast.info(`Refreshing all sources... (${reason})`);

    try {
      await this.playlistService.refreshAll();
      this.memory.settings.last_refresh = Date.now();
      await this.settingsService.updateSettings(this.memory.settings);
      this.toast.success(`Successfully refreshed all sources (${reason})`);
    } catch (error) {
      this.toast.error(`Failed to refresh all sources (${reason})`);
      throw error;
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  /**
   * Reset loader state
   */
  reset(): void {
    this.loading = false;
    this.channels = [];
    this.reachedMax = false;
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────

  /**
   * Check if should load more based on scroll position
   */
  shouldLoadMore(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
    if (this.reachedMax || this.loading) {
      return false;
    }
    return scrollTop + clientHeight >= scrollHeight * 0.75;
  }

  /**
   * Get current channel count
   */
  getChannelCount(): number {
    return this.channels.length;
  }

  /**
   * Check if channels are loaded
   */
  hasChannels(): boolean {
    return this.channels.length > 0;
  }
}
