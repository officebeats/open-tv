import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { NgbModalModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';
import { ErrorService } from '../error.service';
import { of } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SettingsComponent],
      imports: [
        ToastrModule.forRoot(),
        NgbModalModule,
        NgbTooltipModule,
        MatDialogModule,
        FormsModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {
          provide: MemoryService,
          useValue: {
            settings: {},
            HideChannels: of(false),
            SetFocus: of(0),
            SetNode: of({}),
            Refresh: of(null),
            Sort: of(null),
            RefreshSources: of(null),
          },
        },
        { provide: TauriService, useValue: { call: () => Promise.resolve([]) } },
        { provide: ErrorService, useValue: { handleError: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
