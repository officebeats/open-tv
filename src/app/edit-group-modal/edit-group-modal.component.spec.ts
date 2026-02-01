import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { EditGroupModalComponent } from './edit-group-modal.component';
import { GroupNameExistsValidator } from './validators/group-name-exists.directive';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('EditGroupModalComponent', () => {
  let component: EditGroupModalComponent;
  let fixture: ComponentFixture<EditGroupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditGroupModalComponent, GroupNameExistsValidator],
      imports: [ToastrModule.forRoot(), FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        NgbActiveModal,
        { provide: MemoryService, useValue: { settings: {} } },
        { provide: TauriService, useValue: { call: () => Promise.resolve([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditGroupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
