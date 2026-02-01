import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { WhatsNewModalComponent } from './whats-new-modal.component';
import { TauriService } from '../services/tauri.service';
import { MemoryService } from '../memory.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('WhatsNewModalComponent', () => {
  let component: WhatsNewModalComponent;
  let fixture: ComponentFixture<WhatsNewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WhatsNewModalComponent],
      imports: [ToastrModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        NgbActiveModal,
        { provide: MemoryService, useValue: { updateVersion: () => {} } },
        { provide: TauriService, useValue: { openUrl: () => Promise.resolve() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
