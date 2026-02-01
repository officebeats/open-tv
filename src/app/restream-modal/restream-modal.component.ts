import { Component, OnDestroy, OnInit } from '@angular/core';
import { Channel } from '../models/channel';
import { ErrorService } from '../error.service';
import { NetworkInfo } from '../models/networkInfo';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TauriService, UnlistenFn } from '../services/tauri.service';
import { sanitizeFileName } from '../utils';
import { CHANNEL_EXTENSION } from '../models/extensions';

@Component({
  selector: 'app-restream-modal',
  templateUrl: './restream-modal.component.html',
  styleUrl: './restream-modal.component.css',
})
export class RestreamModalComponent implements OnInit, OnDestroy {
  channel?: Channel;
  loading = false;
  watching = false;
  started = false;
  networkInfo?: NetworkInfo;
  selectedIP?: string;
  toUnlisten: UnlistenFn[] = [];

  constructor(
    private error: ErrorService,
    public activeModal: NgbActiveModal,
    private tauri: TauriService,
  ) {}

  ngOnInit(): void {
    this.tauri.call<NetworkInfo>('get_network_info').then((network) => {
      this.networkInfo = network as NetworkInfo;
      this.selectedIP = this.networkInfo.local_ips[0];
    });
    this.tauri
      .on<boolean>('restream_started', () => {
        this.started = true;
        this.loading = false;
      })
      .then((unlisten) => this.toUnlisten.push(unlisten));
  }

  async start() {
    this.loading = true;
    try {
      await this.tauri.call('start_restream', {
        channel: this.channel,
        port: this.networkInfo!.port,
      });
    } catch (e) {
      this.error.handleError(e);
    }
    this.started = false;
    this.loading = false;
  }

  async stop() {
    this.loading = true;
    try {
      await this.tauri.call('stop_restream');
    } catch (e) {
      this.error.handleError(e);
    }
  }

  async watch() {
    this.watching = true;
    try {
      await this.tauri.call('watch_self', { port: this.networkInfo?.port });
    } catch (e) {
      this.error.handleError(e);
    }
    this.watching = false;
  }

  async share() {
    const file = await this.tauri.saveDialog({
      canCreateDirectories: true,
      title: 'Select where to export re-stream',
      defaultPath: `${sanitizeFileName(this.channel?.name!)}_rst${CHANNEL_EXTENSION}`,
    });
    if (!file) {
      return;
    }
    try {
      await this.tauri.call('share_restream', {
        address: this.selectedIP,
        channel: this.channel,
        path: file,
      });
      this.error.success(`Successfully exported re-stream to ${file}`);
    } catch (e) {
      this.error.handleError(e);
    }
  }

  ngOnDestroy(): void {
    this.toUnlisten.forEach((x) => x());
  }
}
