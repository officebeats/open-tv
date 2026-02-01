import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Channel } from '../../../models/channel';
import { PlayerService } from '../../../services/player.service';
import { ErrorService } from '../../../error.service';
import { MemoryService } from '../../../memory.service';
import { TauriService } from '../../../services/tauri.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent {
  @Input() channel?: Channel;
  @Output() playbackStarted = new EventEmitter<void>();
  @Output() playbackError = new EventEmitter<any>();

  starting = false;

  constructor(
    private playerService: PlayerService,
    private error: ErrorService,
    private memory: MemoryService,
    private tauri: TauriService,
  ) {}

  async play(channel: Channel, record: boolean = false, recordPath?: string) {
    if (this.starting) {
      await this.cancelPlay(channel);
      return;
    }

    this.starting = true;
    try {
      await this.playerService.play(channel, record, recordPath);
      await this.playerService.addLastWatched(channel.id!);
      this.playbackStarted.emit();
    } catch (e) {
      this.playbackError.emit(e);
      this.error.handleError(e);
    } finally {
      this.starting = false;
    }
  }

  async cancelPlay(channel: Channel) {
    try {
      await this.tauri.call('cancel_play', {
        sourceId: channel.source_id,
        channelId: channel.id,
      });
    } catch (e) {
      this.error.handleError(e);
    } finally {
      this.starting = false;
    }
  }
}
