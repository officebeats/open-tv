import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { ImportModalComponent } from './import-modal.component';
import { TauriService } from '../services/tauri.service';
import { PlaylistService } from '../services/playlist.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ImportModalComponent', () => {
  let component: ImportModalComponent;
  let fixture: ComponentFixture<ImportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ImportModalComponent],
      imports: [ToastrModule.forRoot(), FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        NgbActiveModal,
        {
          provide: TauriService,
          useValue: { call: () => Promise.resolve([]), openDialog: () => Promise.resolve(null) },
        },
        { provide: PlaylistService, useValue: { refreshAll: () => Promise.resolve() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
