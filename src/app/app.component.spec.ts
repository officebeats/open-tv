import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrModule } from 'ngx-toastr';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MemoryService } from './memory.service';
import { TauriService } from './services/tauri.service';
import { PlaylistService } from './services/playlist.service';
import { ErrorService } from './error.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, MatProgressBarModule, ToastrModule.forRoot(), NgbModalModule],
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: MemoryService, useValue: { settings: {} } },
        { provide: TauriService, useValue: { call: () => Promise.resolve([]) } },
        { provide: PlaylistService, useValue: { checkEpgOnStart: () => {} } },
        { provide: ErrorService, useValue: { handleError: () => {} } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'open-tv'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('open-tv');
  });
});
