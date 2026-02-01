import { GroupNameExistsValidator } from './group-name-exists.directive';
import { TauriService } from '../../services/tauri.service';

describe('GroupNameExistsDirective', () => {
  it('should create an instance', () => {
    const tauriMock = { call: () => Promise.resolve([]) } as any;
    const directive = new GroupNameExistsValidator(tauriMock);
    expect(directive).toBeTruthy();
  });
});
