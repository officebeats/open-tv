/**
 * Beats TV - Premium IPTV Player
 * Copyright (C) 2026 Beats TV Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * This project is a fork of Open TV by Fredolx.
 */

import { Component, Input } from '@angular/core';
import { Source } from '../../models/source';
import { SourceType } from '../../models/sourceType';
import { TauriService } from '../../services/tauri.service';
import { MemoryService } from '../../memory.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditChannelModalComponent } from '../../edit-channel-modal/edit-channel-modal.component';
import { EditGroupModalComponent } from '../../edit-group-modal/edit-group-modal.component';
import { ImportModalComponent } from '../../import-modal/import-modal.component';
import { CHANNEL_EXTENSION, FAVS_BACKUP, PLAYLIST_EXTENSION } from '../../models/extensions';
import { sanitizeFileName } from '../../utils';

import { XtreamPanelInfo } from '../../models/xtream-panel-info';

@Component({
  selector: 'app-source-tile',
  templateUrl: './source-tile.component.html',
  styleUrl: './source-tile.component.css',
})
export class SourceTileComponent {
  @Input('source')
  source?: Source;
  showUsername = false;
  showPassword = false;
  loading = false;
  sourceTypeEnum = SourceType;
  editing = false;
  editableSource: Source = {};
  defaultUserAgent = 'Beats TV';

  details?: XtreamPanelInfo;
  loadingDetails = false;
  showDetails = false;

  constructor(
    public memory: MemoryService,
    private modal: NgbModal,
    private tauri: TauriService,
  ) {}

  async toggleDetails() {
    this.showDetails = !this.showDetails;
    if (this.showDetails && !this.details && this.source?.source_type == SourceType.Xtream) {
      this.loadingDetails = true;
      try {
        this.details = await this.tauri.call<XtreamPanelInfo>('get_xtream_source_details', {
          source: this.source,
        });
      } catch (e) {
        console.error(e);
      } finally {
        this.loadingDetails = false;
      }
    }
  }

  parseDate(dateStr?: string): number | null {
    if (!dateStr) return null;
    const num = parseInt(dateStr, 10);
    return isNaN(num) ? null : num * 1000;
  }

  get_source_type_name() {
    if (!this.source) return null;
    return SourceType[this.source.source_type!];
  }

  async refresh() {
    if (this.source?.source_type == SourceType.Xtream) this.memory.SeriesRefreshed.clear();
    this.memory.IsRefreshing = true;
    this.memory.RefreshPlaylist = this.source?.name || 'Source';
    this.memory.RefreshActivity = 'Starting refresh...';
    this.memory.RefreshPercent = 0;
    try {
      await this.memory.tryIPC('Successfully updated source', 'Failed to refresh source', () =>
        this.tauri.call('refresh_source', { source: this.source }),
      );
    } finally {
      this.memory.IsRefreshing = false;
      this.memory.RefreshPlaylist = '';
      this.memory.RefreshActivity = '';
      this.memory.RefreshPercent = 0;
    }
  }

  async delete() {
    await this.memory.tryIPC('Successfully deleted source', 'Failed to delete source', () =>
      this.tauri.call('delete_source', { id: this.source?.id }),
    );
    this.memory.RefreshSources.next(true);
  }

  async toggleEnabled() {
    await this.memory.tryIPC('Successfully toggled source', 'Failed to toggle source', () =>
      this.tauri.call('toggle_source', { value: !this.source?.enabled, sourceId: this.source?.id }),
    );
    this.memory.RefreshSources.next(true);
  }

  async addCustomChannel() {
    this.memory.ModalRef = this.modal.open(EditChannelModalComponent, {
      backdrop: 'static',
      size: 'xl',
      keyboard: false,
    });
    this.memory.ModalRef.result.then((_) => (this.memory.ModalRef = undefined));
    this.memory.ModalRef.componentInstance.name = 'EditCustomChannelModal';
    this.memory.ModalRef.componentInstance.channel.data.source_id = this.source?.id;
  }

  async addCustomGroup() {
    this.memory.ModalRef = this.modal.open(EditGroupModalComponent, {
      backdrop: 'static',
      size: 'xl',
      keyboard: false,
    });
    this.memory.ModalRef.result.then((_) => (this.memory.ModalRef = undefined));
    this.memory.ModalRef.componentInstance.name = 'EditCustomGroupModal';
    this.memory.ModalRef.componentInstance.group.source_id = this.source?.id;
  }

  async import() {
    this.memory.ModalRef = this.modal.open(ImportModalComponent, {
      backdrop: 'static',
      size: 'xl',
      keyboard: false,
    });
    this.memory.ModalRef.result.then((_) => (this.memory.ModalRef = undefined));
    this.memory.ModalRef.componentInstance.name = 'ImportModalComponent';
    this.memory.ModalRef.componentInstance.source_id = this.source?.id;
  }

  async share() {
    let file = await this.tauri.saveDialog({
      canCreateDirectories: true,
      title: 'Select where to export custom source',
      defaultPath: sanitizeFileName(this.source?.name!) + PLAYLIST_EXTENSION,
    });
    if (file) {
      await this.memory.tryIPC(
        `Successfully exported source in ${file}`,
        'Failed to export source',
        () => this.tauri.call('share_custom_source', { source: this.source, path: file }),
      );
    }
  }

  edit() {
    this.editableSource = { ...this.source };
    this.editing = true;
  }

  async save() {
    await this.memory.tryIPC('Successfully saved changes', 'Failed to save changes', async () => {
      this.editableSource.user_agent = this.editableSource.user_agent?.trim();
      this.editableSource.stream_user_agent = this.editableSource.stream_user_agent?.trim();
      if (this.editableSource.user_agent == '') this.editableSource.user_agent = undefined;
      if (this.editableSource.stream_user_agent == '')
        this.editableSource.stream_user_agent = undefined;
      await this.tauri.call('update_source', { source: this.editableSource });
      this.source = this.editableSource;
      this.editing = false;
      this.editableSource = {};
    });
  }

  async browse() {
    const file = await this.tauri.openDialog({
      multiple: false,
      directory: false,
      title: 'Select a new m3u file for source',
      filters: [{ name: 'extension', extensions: ['m3u', 'm3u8'] }],
    });
    if (file) {
      if (typeof file === 'string') {
        this.editableSource.url = file;
      } else if (Array.isArray(file) && file.length > 0) {
        this.editableSource.url = file[0];
      }
    }
  }

  cancel() {
    this.editableSource = {};
    this.editing = false;
  }

  async backupFavs() {
    const file = await this.tauri.saveDialog({
      canCreateDirectories: true,
      title: 'Select where to save favorites',
      defaultPath: `${sanitizeFileName(this.source?.name!)}_favs${FAVS_BACKUP}`,
    });
    if (file) {
      await this.memory.tryIPC(
        'Successfully saved favorites backup',
        'Failed to save favorites backup',
        async () => {
          await this.tauri.call('backup_favs', { id: this.source?.id, path: file });
        },
      );
    }
  }

  async restoreFavs() {
    const file = await this.tauri.openDialog({
      canCreateDirectories: false,
      title: 'Select a favorites backup',
      directory: false,
      multiple: false,
      filters: [{ name: 'extension', extensions: ['otvf'] }],
    });
    if (file) {
      await this.memory.tryIPC(
        'Successfully saved favorites backup',
        'Failed to save favorites backup',
        async () => {
          let path = '';
          if (typeof file === 'string') path = file;
          else if (Array.isArray(file) && file.length > 0) path = file[0];

          if (path) await this.tauri.call('restore_favs', { id: this.source?.id, path: path });
        },
      );
    }
  }
}
