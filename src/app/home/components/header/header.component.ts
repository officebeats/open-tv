import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { fromEvent, filter, map, debounceTime, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements AfterViewInit {
  @Input() selectedCount = 0;
  @Input() selectionMode = false;
  @Input() bulkDisabled = false;
  @Input() bulkMenu: any;
  @Input() loading = false;

  @Output() toggleSelectionMode = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() reloadRequested = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<string>();

  @ViewChild('searchInput') searchInput!: ElementRef;

  private searchSubscription?: Subscription;

  ngAfterViewInit() {
    this.searchSubscription = fromEvent(this.searchInput.nativeElement, 'keyup')
      .pipe(
        filter((event: any) => event.key !== 'Escape'),
        map((event: any) => event.target.value),
        debounceTime(300),
      )
      .subscribe((term: string) => {
        this.searchChanged.emit(term);
      });
  }

  onReload() {
    this.reloadRequested.emit();
  }

  focusSearch() {
    this.searchInput.nativeElement.focus();
  }

  clearSearch() {
    this.searchInput.nativeElement.value = '';
    this.searchChanged.emit('');
  }
}
