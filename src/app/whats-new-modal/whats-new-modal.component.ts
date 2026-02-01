import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';

@Component({
  selector: 'app-whats-new-modal',
  templateUrl: './whats-new-modal.component.html',
  styleUrl: './whats-new-modal.component.css',
})
export class WhatsNewModalComponent {
  constructor(
    private activeModal: NgbActiveModal,
    public memory: MemoryService,
    private tauri: TauriService,
  ) {}
  content?: string;

  close() {
    this.memory.updateVersion();
    this.activeModal.close('Cross click');
  }

  openDonate() {
    this.tauri.openUrl('https://github.com/Fredolx/open-tv/discussions/69');
  }
}
