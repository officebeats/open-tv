import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrl: './import-modal.component.css',
})
export class ImportModalComponent {
  source_id?: number;
  nameOverride?: string;
  constructor(
    public activeModal: NgbActiveModal,
    public memory: MemoryService,
    private tauri: TauriService,
  ) {}

  async selectFile() {
    const file = await this.tauri.openDialog({
      multiple: false,
      directory: false,
      canCreateDirectories: false,
      title: 'Select Beats TV export file',
      filters: [{ name: 'extension', extensions: ['otv', 'otvg'] }],
    });
    if (file == null) {
      return;
    }
    this.nameOverride = this.nameOverride?.trim();
    if (this.nameOverride == '') this.nameOverride = undefined;
    let fail = await this.memory.tryIPC(
      'Successfully imported file',
      'Failed to import file',
      async () => {
        let path = '';
        if (typeof file === 'string') path = file;
        else if (Array.isArray(file) && file.length > 0) path = file[0];

        if (path)
          await this.tauri.call('import', {
            sourceId: this.source_id,
            path: path,
            nameOverride: this.nameOverride,
          });
      },
    );
    this.memory.RefreshSources.next(true);
    if (!fail) this.activeModal.close('close');
  }
}
