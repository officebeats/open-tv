import { UnlistenFn } from '../services/tauri.service';
import { Subject } from 'rxjs';
import { Channel } from './channel';

export class Download {
  id!: string;
  progress!: number;
  complete!: Subject<boolean>;
  channel!: Channel;
  unlisten?: UnlistenFn;
  progressUpdate!: Subject<number>;
}
