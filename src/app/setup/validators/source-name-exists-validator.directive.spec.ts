import { SourceNameExistsValidator } from './source-name-exists-validator.directive';
import { TauriService } from '../../services/tauri.service';

describe('SourceNameExistsValidatorDirective', () => {
  it('should create an instance', () => {
    const tauriMock = { call: () => Promise.resolve([]) } as any;
    const directive = new SourceNameExistsValidator(tauriMock);
    expect(directive).toBeTruthy();
  });
});
