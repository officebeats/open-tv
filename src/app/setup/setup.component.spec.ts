import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { NgbModalModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { SetupComponent } from './setup.component';
import { NotEmptyValidatorDirective } from './validators/not-empty-validator.directive';
import { SourceNameExistsValidator } from './validators/source-name-exists-validator.directive';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';
import { ErrorService } from '../error.service';
import { PlaylistService } from '../services/playlist.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('SetupComponent', () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SetupComponent, NotEmptyValidatorDirective, SourceNameExistsValidator],
      imports: [ToastrModule.forRoot(), NgbModalModule, NgbTooltipModule, FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: MemoryService, useValue: { settings: {}, Sources: new Map() } },
        { provide: TauriService, useValue: { call: () => Promise.resolve([]) } },
        { provide: ErrorService, useValue: { handleError: () => {} } },
        { provide: PlaylistService, useValue: { refreshAll: () => Promise.resolve() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
