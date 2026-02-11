import { FilterChip } from './filter-chips/filter-chips.component';
import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  ViewChild,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { AllowIn, ShortcutInput } from 'ng-keyboard-shortcuts';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription, from, forkJoin, lastValueFrom, skip } from 'rxjs';
import { MemoryService } from '../memory.service';
import { Channel } from '../models/channel';
import { ViewMode } from '../models/viewMode';
import { MediaType } from '../models/mediaType';
import { ToastrService } from 'ngx-toastr';
import { Source } from '../models/source';
import { SourceType } from '../models/sourceType';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ErrorService } from '../error.service';
import { Settings } from '../models/settings';
import { SortType } from '../models/sortType';
import { LAST_SEEN_VERSION } from '../models/localStorage';
import { Node } from '../models/node';
import { NodeType } from '../models/nodeType';
import { BulkActionType } from '../models/bulkActionType';
import { TauriService } from '../services/tauri.service';
import { SettingsService } from '../services/settings.service';
import { PlaylistService } from '../services/playlist.service';
import { PlayerService } from '../services/player.service';
import { HeaderComponent } from './components/header/header.component';
import { PlayerComponent } from './components/player/player.component';
import { FilterService } from '../services/filter.service';
import { CategoryManagerModalComponent } from './components/category-manager-modal/category-manager-modal.component';
import { MovieMetadataService, MovieData } from '../services/movie-metadata.service';
import { NavigationService } from '../services/navigation.service';
import { SelectionService } from '../services/selection.service';
import { ChannelLoaderService } from '../services/channel-loader.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, height: 0, padding: '0', margin: '0' }),
        animate('250ms', style({ opacity: 1, height: '*', padding: '*', margin: '*' })),
      ]),
      transition(':leave', [
        style({ opacity: 1, height: '*', padding: '*', margin: '*' }),
        animate('250ms', style({ opacity: 0, height: 0, padding: '0', margin: '0' })),
      ]),
    ]),
    trigger('fade', [
      state(
        'visible',
        style({
          opacity: 1,
        }),
      ),
      state(
        'hidden',
        style({
          opacity: 0,
        }),
      ),
      transition('visible => hidden', [animate('250ms ease-out')]),
      transition('hidden => visible', [animate('250ms ease-in')]),
    ]),
  ],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  // Core State
  readonly viewModeEnum = ViewMode;
  bulkActionType = BulkActionType;
  readonly mediaTypeEnum = MediaType;

  @ViewChild('header') header!: HeaderComponent;
  @ViewChild('player') player!: PlayerComponent;

  shortcuts: ShortcutInput[] = [];
  prevSearchValue: string = '';
  showScrollTop = false;

  // Window size tracking
  currentWindowSize: number = window.innerWidth;
  subscriptions: Subscription[] = [];

  // New UI Properties
  filterChips: FilterChip[] = [
    { id: 'live', label: 'Live TV', active: true, type: 'media', value: MediaType.livestream },
    { id: 'movies', label: 'Movies', active: false, type: 'media', value: MediaType.movie },
    { id: 'series', label: 'Series', active: false, type: 'media', value: MediaType.serie },
  ];
  genreInput: string = '';
  minRating: number = 0;
  selectedChannelForModal: Channel | null = null;
  isLoadingDetails: boolean = false;
  isLoadingMetadata: boolean = false;
  movieData: MovieData | null = null;

  constructor(
    private router: Router,
    public memory: MemoryService,
    public toast: ToastrService,
    private error: ErrorService,
    private tauri: TauriService,
    private settingsService: SettingsService,
    private playlistService: PlaylistService,
    private playerService: PlayerService,
    public filterService: FilterService,
    private modalService: NgbModal,
    private movieMetadataService: MovieMetadataService,
    public navigation: NavigationService,
    public selection: SelectionService,
    public channelLoader: ChannelLoaderService,
  ) {}

  ngOnInit() {
    // Safety delay for Webview2 bridge stabilization
    setTimeout(() => {
      this.getSources();
    }, 200);
  }

  openCategoryManager() {
    const modalRef = this.modalService.open(CategoryManagerModalComponent, {
      size: 'xl',
      backdrop: true,
      keyboard: true,
      windowClass: 'premium-modal',
    });

    // Handle both close (success) and dismiss (backdrop/ESC)
    modalRef.result.then(
      () => {
        if (modalRef.componentInstance.hasChanges) {
          this.reload();
        }
      },
      () => {
        if (modalRef.componentInstance.hasChanges) {
          this.reload();
        }
      },
    );
  }

  async onViewModeChanged(mode: ViewMode) {
    console.log(`[Home] View mode changing to: ${mode}`);
    this.filterService.switchViewMode(mode);
    await this.load();
  }

  bulkActionFromBar(action: string) {
    switch (action) {
      case 'Favorite':
        this.selection.bulkAction(this.bulkActionType.Favorite);
        break;
      case 'Hide':
        this.selection.bulkAction(this.bulkActionType.Hide);
        break;
      case 'Whitelist':
        this.selection.whitelistSelected();
        break;
    }
  }

  getSources() {
    let get_settings = this.tauri.call('get_settings');
    let get_sources = this.tauri.call('get_sources');
    Promise.all([get_settings, get_sources])
      .then((data) => {
        let settings = data[0] as Settings;
        let sources = data[1] as Source[];
        this.memory.settings = settings;
        if (settings.zoom) this.tauri.setZoom(Math.trunc(settings.zoom! * 100) / 10000);
        this.memory.trayEnabled = settings.enable_tray_icon ?? true;
        this.memory.AlwaysAskSave = settings.always_ask_save ?? false;
        this.memory.Sources = new Map(sources.filter((x) => x.enabled).map((s) => [s.id!, s]));

        if (sources.length == 0) {
          this.reset();
        } else if (this.memory.Sources.size === 0) {
          // All sources disabled warning removed or handled via UI state
        } else {
          this.tauri.getAppVersion().then((version) => {
            if (localStorage.getItem(LAST_SEEN_VERSION) != version) {
              this.memory.AppVersion = version;
              this.memory.updateVersion();
            }
          });
          sources
            .filter((x) => x.source_type == SourceType.Custom)
            .map((x) => x.id!)
            .forEach((x) => this.memory.CustomSourceIds?.add(x));
          sources
            .filter((x) => x.source_type == SourceType.Xtream)
            .map((x) => x.id!)
            .forEach((x) => this.memory.XtreamSourceIds.add(x));
          if (
            this.memory.XtreamSourceIds.size > 0 &&
            !sessionStorage.getItem('epgCheckedOnStart')
          ) {
            sessionStorage.setItem('epgCheckedOnStart', 'true');
            this.playlistService.checkEpgOnStart();
          }

          // Initialize filters using FilterService
          this.filterService.initializeFilters(
            Array.from(this.memory.Sources.keys()),
            settings.default_sort,
          );

          // Refresh on start logic
          const refreshOnStart = settings.refresh_on_start === true;
          // Refresh interval logic
          const refreshInterval = settings.refresh_interval || 0;
          const lastRefresh = settings.last_refresh || 0;
          const now = Date.now();
          const hoursSinceLastRefresh = (now - lastRefresh) / (1000 * 60 * 60);

          let shouldRefresh = false;
          let refreshReason = '';

          if (refreshOnStart && !sessionStorage.getItem('refreshedOnStart')) {
            shouldRefresh = true;
            refreshReason = 'refresh on start enabled';
          } else if (refreshInterval > 0 && hoursSinceLastRefresh >= refreshInterval) {
            shouldRefresh = true;
            refreshReason = `interval of ${refreshInterval} hours passed`;
          }

          if (shouldRefresh) {
            sessionStorage.setItem('refreshedOnStart', 'true');
            this.channelLoader.refreshAll(refreshReason).then((_) => _);
          }

          this.load().then((_) => _);
        }
      })
      .catch((e) => {
        this.error.handleError(e);
        this.reset();
      });
  }

  async refreshOnStart() {
    await this.channelLoader.refreshAll('refresh on start enabled');
  }

  async reload() {
    await this.load();
  }

  reset() {
    this.router.navigateByUrl('setup');
  }

  async addEvents() {
    this.subscriptions.push(
      this.memory.HideChannels.subscribe((val) => {
        // Channels visibility is now managed by ChannelLoaderService
      }),
    );
    this.subscriptions.push(
      this.memory.SetFocus.subscribe((focus) => {
        this.navigation.focus = focus;
      }),
    );
    this.subscriptions.push(
      this.memory.SetNode.subscribe(async (dto) => {
        const node = new Node(
          dto.id,
          dto.name,
          dto.type,
          this.filterService.filters?.query,
          this.filterService.filters?.view_type,
        );
        this.navigation.pushNode(node);
        if (dto.type == NodeType.Category) this.filterService.setGroup(dto.id);
        else if (dto.type == NodeType.Series) {
          this.filterService.setSeries(dto.id, [dto.sourceId!]);
        } else if (dto.type == NodeType.Season) this.filterService.setSeason(dto.id);

        if (this.filterService.filters!.view_type == ViewMode.Hidden) {
          this.filterService.switchViewMode(ViewMode.Categories);
        }

        this.clearSearch();
        await this.load();
        if (this.navigation.focusArea == 0) this.navigation.selectFirstChannelDelayed(100);
      }),
    );
    this.subscriptions.push(
      this.memory.Refresh.subscribe((scroll) => {
        this.load();
        if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
      }),
    );
    this.subscriptions.push(
      this.memory.Sort.pipe(skip(1)).subscribe(async ([sort, load]) => {
        if (!this.filterService.filters || !load) return;
        this.filterService.filters!.sort = sort;
        await this.load();
      }),
    );
  }

  clearSearch() {
    if (this.header) this.header.clearSearch();
    this.prevSearchValue = '';
    this.filterService.clearQuery();
  }

  onSearchChanged(term: string) {
    this.navigation.focus = 0;
    this.navigation.focusArea = 0;
    this.filterService.setQuery(term);
    this.load();
  }

  onPlaybackStarted() {
    this.onModalClose();
  }

  async loadMore() {
    await this.channelLoader.loadMore(this.filterService.filters!);
  }

  async load() {
    try {
      await this.channelLoader.loadChannels(this.filterService.filters!, false);
    } catch (e) {
      this.error.handleError(e);
    }
  }

  checkScrollTop() {
    const scrollPosition =
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollTop = scrollPosition > 300;
  }

  async checkScrollEnd() {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;
    if (this.channelLoader.shouldLoadMore(scrollTop, scrollHeight, clientHeight)) {
      await this.loadMore();
    }
  }

  @HostListener('window:scroll', ['$event'])
  async scroll(_event: Event) {
    this.checkScrollTop();
    await this.checkScrollEnd();
  }

  ngAfterViewInit(): void {
    this.addEvents().then((_) => _);

    this.shortcuts.push(
      {
        key: ['ctrl + f', 'ctrl + space', 'cmd + f'],
        label: 'Search',
        description: 'Go to search',
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: (_) => this.navigation.focusSearch(this.header?.searchInput?.nativeElement),
      },
      {
        key: ['ctrl + a', 'cmd + a'],
        label: 'Switching modes',
        description: 'Selects the all channels view',
        preventDefault: true,
        command: async (_) => await this.filterService.switchViewMode(this.viewModeEnum.All),
      },
      {
        key: ['ctrl + s', 'cmd + s'],
        label: 'Switching modes',
        description: 'Selects the categories view',
        command: async (_) => await this.filterService.switchViewMode(this.viewModeEnum.Categories),
      },
      {
        key: ['ctrl + d', 'cmd + d'],
        label: 'Switching modes',
        description: 'Selects the history view',
        command: async (_) => await this.filterService.switchViewMode(this.viewModeEnum.History),
      },
      {
        key: ['ctrl + r', 'cmd + r'],
        label: 'Switching modes',
        description: 'Selects the favorites view',
        command: async (_) => await this.filterService.switchViewMode(this.viewModeEnum.Favorites),
      },
      {
        key: 'ctrl + q',
        label: 'Media Type Filters',
        description: 'Enable/Disable livestreams',
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: async (_) => {
          this.filterService.toggleMediaType(MediaType.livestream);
        },
      },
      {
        key: 'ctrl + w',
        label: 'Media Type Filters',
        description: 'Enable/Disable movies',
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: async (_) => {
          this.filterService.toggleMediaType(MediaType.movie);
        },
      },
      {
        key: 'ctrl + e',
        label: 'Media Type Filters',
        description: 'Enable/Disable series',
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: async (_) => {
          this.filterService.toggleMediaType(MediaType.serie);
        },
      },
      {
        key: 'left',
        label: 'Navigation',
        description: 'Go left',
        allowIn: [AllowIn.Input],
        command: async (_) => await this.nav('ArrowLeft'),
      },
      {
        key: 'right',
        label: 'Navigation',
        description: 'Go right',
        allowIn: [AllowIn.Input],
        command: async (_) => await this.nav('ArrowRight'),
      },
      {
        key: 'up',
        label: 'Navigation',
        description: 'Go up',
        allowIn: [AllowIn.Input],
        preventDefault: true,
        command: async (_) => await this.nav('ArrowUp'),
      },
      {
        key: 'down',
        label: 'Navigation',
        description: 'Go down',
        allowIn: [AllowIn.Input],
        preventDefault: true,
        command: async (_) => await this.nav('ArrowDown'),
      },
    );
  }

  async nav(key: string): Promise<boolean> {
    if (this.navigation.isSearchFocused()) return false;

    const result = await this.navigation.navigate(
      key,
      this.channelLoader.channels.length,
      this.channelLoader.reachedMax,
      this.filterService.areFiltersVisible(),
      this.shortFiltersMode(),
      this.currentWindowSize < 768,
      this.filterService.getCurrentPage(),
    );

    if (result) {
      await this.loadMore();
    }

    return result;
  }

  shortFiltersMode() {
    return (
      this.filterService.filters?.source_ids.findIndex((x) => this.memory.XtreamSourceIds.has(x)) ==
      -1
    );
  }

  anyXtream() {
    return (
      Array.from(this.memory.Sources.values()).findIndex(
        (x) => x.source_type == SourceType.Xtream,
      ) != -1
    );
  }

  async goBackHotkey() {
    if (this.memory.ModalRef) {
      if (
        this.memory.ModalRef.componentInstance.name != 'RestreamModalComponent' ||
        !this.memory.ModalRef.componentInstance.started
      )
        this.memory.ModalRef.close('close');
      return;
    } else if (this.memory.currentContextMenu?.menuOpen) {
      this.closeContextMenu();
    } else if (this.navigation.isSearchFocused()) {
      this.navigation.selectFirstChannel();
    } else if (this.filterService.filters?.query) {
      if (this.filterService.filters?.query) {
        this.clearSearch();
        await this.load();
      }
      this.navigation.selectFirstChannelDelayed(100);
    } else if (this.navigation.hasNodes()) {
      await this.goBack();
      this.navigation.selectFirstChannelDelayed(100);
    } else {
      this.navigation.selectFirstChannel();
    }
  }

  async goBack() {
    const node = this.navigation.popNode();
    if (node.type == NodeType.Category) this.filterService.setGroup(undefined);
    else if (node.type == NodeType.Series) {
      this.filterService.setSeries(undefined, Array.from(this.memory.Sources.keys()));
    } else if (node.type == NodeType.Season) {
      this.filterService.setSeason(undefined);
    }
    if (node.query) {
      this.filterService.setQuery(node.query);
      // Restore the search input value via the header component
      if (this.header?.searchInput) {
        this.header.searchInput.nativeElement.value = node.query;
      }
    }
    if (node.fromViewType && this.filterService.filters!.view_type !== node.fromViewType) {
      this.filterService.switchViewMode(node.fromViewType);
    }
    await this.load();
  }

  openSettings() {
    this.router.navigateByUrl('settings');
  }

  trackByChannelId(index: number, channel: Channel): any {
    return channel.id || index;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key == 'Tab' && !this.memory.ModalRef) {
      event.preventDefault();
      this.nav(event.shiftKey ? 'ShiftTab' : 'Tab');
    }
    if (event.key == 'Enter' && this.navigation.focusArea == 1) {
      const activeElement = document.activeElement as HTMLElement | null;
      activeElement?.click();
    }
  }

  closeContextMenu() {
    if (this.memory.currentContextMenu?.menuOpen) {
      this.memory.currentContextMenu?.closeMenu();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((x) => x?.unsubscribe());
  }

  async toggleKeywords() {
    this.filterService.toggleKeywords();
    await this.load();
  }

  async bulkAction(action: BulkActionType) {
    if (!this.filterService.filters) return;
    if (this.filterService.filters.series_id && !this.filterService.filters.season) {
      return;
    }
    const actionName = BulkActionType[action].toLowerCase();
    try {
      await this.playlistService.bulkUpdate(this.filterService.filters, action);
      await this.load();
      this.toast.success(`Successfully executed bulk update: ${actionName}`);
    } catch (e) {
      this.error.handleError(e);
    }
  }

  // New UI Methods

  async onFilterChipChanged(chip: FilterChip) {
    chip.active = !chip.active;
    if (chip.type === 'media') {
      this.filterService.toggleMediaType(chip.value);
      await this.load();
    }
  }

  async onMediaTypeToggled(mediaType: MediaType) {
    this.filterService.toggleMediaType(mediaType);
    await this.load();
  }

  async toggleVods(state: boolean) {
    if (state) {
      this.filterService.setMediaTypes([
        MediaType.movie,
        MediaType.serie,
        ...(this.filterService.filters?.media_types.filter(
          (t) => t !== MediaType.movie && t !== MediaType.serie,
        ) || []),
      ]);
    } else {
      this.filterService.setMediaTypes(
        this.filterService.filters?.media_types.filter(
          (t) => t !== MediaType.movie && t !== MediaType.serie,
        ) || [],
      );
    }
    await this.load();
  }

  async updateGenre(value: string) {
    this.genreInput = value;
    this.filterService.setGenre(value || undefined);
    await this.load();
  }

  async updateRating(value: number) {
    this.minRating = value;
    this.filterService.setMinRating(value > 0 ? value : undefined);
    await this.load();
  }

  async openDetails(channel: Channel) {
    this.selectedChannelForModal = channel;
    this.isLoadingDetails = true;
    this.isLoadingMetadata = true;
    this.movieData = null;

    try {
      // Check if this is a movie and fetch metadata using the service
      if (channel.media_type === MediaType.movie && channel.name) {
        const data = await this.movieMetadataService.getMovieData(channel.name);
        if (data) {
          this.movieData = data;
        }
      }
    } catch (e) {
      // Fall back to channel data if metadata fetch fails
    } finally {
      this.isLoadingDetails = false;
      this.isLoadingMetadata = false;
    }
  }

  /**
   * Prefetch movie data when hovering over a movie channel
   */
  onChannelHover(channel: Channel): void {
    if (channel.media_type === MediaType.movie && channel.name) {
      this.movieMetadataService.prefetchMovieData(channel.name);
    }
  }

  /**
   * Cancel pending prefetch when mouse leaves
   */
  onChannelLeave(): void {
    this.movieMetadataService.cancelPrefetch();
  }

  onModalClose() {
    this.selectedChannelForModal = null;
  }

  onModalPlay() {
    if (this.selectedChannelForModal) {
      this.player.play(this.selectedChannelForModal);
    }
  }

  openImdb() {
    if (this.movieData?.imdbId) {
      const url = `https://www.imdb.com/title/${this.movieData.imdbId}`;
      window.open(url, '_blank');
    }
  }

  bulkHide(hide: boolean) {
    this.selection.bulkAction(hide ? BulkActionType.Hide : BulkActionType.Unhide);
  }

  bulkFavorite(fav: boolean) {
    this.selection.bulkAction(fav ? BulkActionType.Favorite : BulkActionType.Unfavorite);
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getFilterChips(): FilterChip[] {
    const mediaTypes = this.filterService.filters?.media_types || [];
    const mediaTypeLabels: Record<MediaType, string> = {
      [MediaType.livestream]: 'Live TV',
      [MediaType.movie]: 'Movies',
      [MediaType.serie]: 'Series',
      [MediaType.group]: 'Groups',
      [MediaType.season]: 'Seasons',
    };

    return mediaTypes
      .filter(
        (type) =>
          type !== MediaType.livestream && type !== MediaType.movie && type !== MediaType.serie,
      )
      .map((type) => ({
        id: `media-${type}`,
        label: mediaTypeLabels[type] || MediaType[type],
        active: true,
        type: 'media' as const,
        value: type,
      }));
  }
}
