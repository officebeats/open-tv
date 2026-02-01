import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ViewMode } from '../../../models/viewMode';
import { MediaType } from '../../../models/mediaType';
import { MemoryService } from '../../../memory.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() currentViewType: ViewMode = ViewMode.All;
  @Input() chkLiveStream = true;
  @Input() chkMovie = true;
  @Input() chkSerie = true;
  @Input() showSeries = false;

  @Output() viewModeChanged = new EventEmitter<ViewMode>();
  @Output() mediaTypeToggled = new EventEmitter<MediaType>();

  viewModeEnum = ViewMode;

  constructor(public memory: MemoryService) {}

  switchMode(mode: ViewMode) {
    this.viewModeChanged.emit(mode);
  }

  toggleMediaType(mediaType: MediaType) {
    this.mediaTypeToggled.emit(mediaType);
  }
}
