import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { ViewMode } from '../../../models/viewMode';
import { MediaType } from '../../../models/mediaType';
import { MemoryService } from '../../../memory.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent {
  @Input() currentViewType: ViewMode = ViewMode.All;
  @Input() chkLiveStream = true;
  @Input() chkMovie = true;
  @Input() chkSerie = true;
  @Input() showSeries = false;
  logoFailed = false;

  @Output() viewModeChanged = new EventEmitter<ViewMode>();
  @Output() mediaTypeToggled = new EventEmitter<MediaType>();

  viewModeEnum = ViewMode;

  constructor(public memory: MemoryService) {}

  onLogoError(event: Event) {
    this.logoFailed = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  switchMode(mode: ViewMode) {
    this.viewModeChanged.emit(mode);
  }

  toggleMediaType(mediaType: MediaType) {
    this.mediaTypeToggled.emit(mediaType);
  }

  getLogoSrc(): string {
    const body = document.body;
    if (body.classList.contains('theme-matrix-terminal')) {
      return 'assets/logo_theme_2.png'; // Green
    }
    // Default to Blue (theme-smooth-glass or no class)
    return 'assets/logo_theme_1.png';
  }
}
