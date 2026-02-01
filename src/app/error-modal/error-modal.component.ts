import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TauriService } from '../services/tauri.service';

@Component({
  selector: 'app-error-modal',
  templateUrl: './error-modal.component.html',
  styleUrl: './error-modal.component.css',
})
export class ErrorModalComponent {
  error?: string;
  constructor(
    public activeModal: NgbActiveModal,
    private toastr: ToastrService,
    private tauri: TauriService,
  ) {}

  async copy() {
    await this.tauri.clipboardWriteText(this.error!);
    this.toastr.success('Copied error');
  }
}
