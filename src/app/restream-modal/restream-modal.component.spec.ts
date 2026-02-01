import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { RestreamModalComponent } from './restream-modal.component';
import { TauriService } from '../services/tauri.service';
import { ErrorService } from '../error.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('RestreamModalComponent', () => {
  let component: RestreamModalComponent;
  let fixture: ComponentFixture<RestreamModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RestreamModalComponent],
      imports: [ToastrModule.forRoot(), FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        NgbActiveModal,
        {
          provide: TauriService,
          useValue: { call: () => Promise.resolve([]), on: () => Promise.resolve(() => {}) },
        },
        { provide: ErrorService, useValue: { handleError: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestreamModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
