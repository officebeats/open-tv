import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { MatMenuModule } from '@angular/material/menu';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { SortButtonComponent } from './sort-button.component';
import { MemoryService } from '../../memory.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

describe('SortButtonComponent', () => {
  let component: SortButtonComponent;
  let fixture: ComponentFixture<SortButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SortButtonComponent],
      imports: [ToastrModule.forRoot(), MatMenuModule, NgbModalModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: MemoryService, useValue: { Sort: of(null) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SortButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
