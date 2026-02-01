import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { NgbModalModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChannelTileComponent } from './channel-tile.component';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';
import { ErrorService } from '../error.service';
import { PlaylistService } from '../services/playlist.service';
import { DownloadService } from '../download.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ChannelTileComponent', () => {
  let component: ChannelTileComponent;
  let fixture: ComponentFixture<ChannelTileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChannelTileComponent],
      imports: [
        ToastrModule.forRoot(),
        NgbModalModule,
        NgbTooltipModule,
        MatMenuModule,
        MatTooltipModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: MemoryService, useValue: { settings: {}, Sources: new Map() } },
        { provide: TauriService, useValue: { call: () => Promise.resolve([]) } },
        { provide: ErrorService, useValue: { handleError: () => {} } },
        { provide: PlaylistService, useValue: { favoriteChannel: () => Promise.resolve() } },
        { provide: DownloadService, useValue: { Downloads: new Map() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelTileComponent);
    component = fixture.componentInstance;
    component.channel = { id: 1, name: 'Test Channel', media_type: 1 } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
