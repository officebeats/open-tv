import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ErrorService } from '../error.service';

import { TauriService } from '../services/tauri.service';

@Component({
  selector: 'app-confirm-delete-modal',
  templateUrl: './confirm-delete-modal.component.html',
  styleUrl: './confirm-delete-modal.component.css',
})
export class ConfirmDeleteModalComponent {
  constructor(
    public activeModal: NgbActiveModal,
    private error: ErrorService,
    private tauri: TauriService,
  ) {}
  loading: boolean = false;

  async delete() {
    this.loading = true;
    try {
      await this.tauri.call('delete_database');
    } catch (e) {
      this.error.handleError(e);
    }
    this.loading = false;
  }
}
