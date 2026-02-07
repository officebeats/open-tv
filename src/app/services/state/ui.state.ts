/**
 * Manages UI-specific state like modals, context menus, and focus.
 * This service handles transient UI state that doesn't need persistence.
 */
import { Injectable } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

/**
 * Centralized UI state management.
 * Tracks modals, context menus, and other transient UI elements.
 */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  private _activeModal: NgbModalRef | undefined;

  get activeModal(): NgbModalRef | undefined {
    return this._activeModal;
  }

  set activeModal(modal: NgbModalRef | undefined) {
    this._activeModal = modal;
  }

  /** Check if any modal is currently open */
  hasOpenModal(): boolean {
    return this._activeModal !== undefined;
  }

  /** Close the active modal if it exists and can be closed */
  closeActiveModal(result?: any): void {
    if (this._activeModal) {
      this._activeModal.close(result);
      this._activeModal = undefined;
    }
  }

  /** Dismiss the active modal if it exists */
  dismissActiveModal(reason?: any): void {
    if (this._activeModal) {
      this._activeModal.dismiss(reason);
      this._activeModal = undefined;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT MENU STATE
  // ═══════════════════════════════════════════════════════════════════════════

  private _contextMenu: MatMenuTrigger | undefined;

  get contextMenu(): MatMenuTrigger | undefined {
    return this._contextMenu;
  }

  set contextMenu(menu: MatMenuTrigger | undefined) {
    this._contextMenu = menu;
  }

  /** Check if context menu is open */
  isContextMenuOpen(): boolean {
    return this._contextMenu?.menuOpen ?? false;
  }

  /** Close the context menu if open */
  closeContextMenu(): void {
    if (this._contextMenu?.menuOpen) {
      this._contextMenu.closeMenu();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT STATE
  // ═══════════════════════════════════════════════════════════════════════════

  private _isContainer: boolean = false;
  private _appVersion: string | undefined;
  private _trayEnabled: boolean = true;
  private _alwaysAskSave: boolean = false;

  get isContainer(): boolean {
    return this._isContainer;
  }

  set isContainer(value: boolean) {
    this._isContainer = value;
  }

  get appVersion(): string | undefined {
    return this._appVersion;
  }

  set appVersion(value: string | undefined) {
    this._appVersion = value;
  }

  get trayEnabled(): boolean {
    return this._trayEnabled;
  }

  set trayEnabled(value: boolean) {
    this._trayEnabled = value;
  }

  get alwaysAskSave(): boolean {
    return this._alwaysAskSave;
  }

  set alwaysAskSave(value: boolean) {
    this._alwaysAskSave = value;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EPG STATE
  // ═══════════════════════════════════════════════════════════════════════════

  private _watchedEpgs: Set<string> = new Set();

  get watchedEpgs(): Set<string> {
    return this._watchedEpgs;
  }

  setWatchedEpgs(epgIds: string[]): void {
    this._watchedEpgs = new Set(epgIds);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIES REFRESH TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  private _refreshedSeries: Set<number> = new Set();

  hasSeriesRefreshed(seriesId: number): boolean {
    return this._refreshedSeries.has(seriesId);
  }

  markSeriesRefreshed(seriesId: number): void {
    this._refreshedSeries.add(seriesId);
  }

  clearSeriesRefresh(seriesId: number): void {
    this._refreshedSeries.delete(seriesId);
  }
}
