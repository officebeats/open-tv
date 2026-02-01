import { Injectable, NgZone } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn, Event, emit } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getVersion } from '@tauri-apps/api/app';
import { open, OpenDialogOptions } from '@tauri-apps/plugin-dialog';
export { UnlistenFn, Event };

@Injectable({
  providedIn: 'root',
})
export class TauriService {
  constructor(private zone: NgZone) {}

  /**
   * Invokes a command on the Rust backend.
   * @param command The name of the command.
   * @param args Optional arguments for the command.
   */
  async call<T>(command: string, args?: any): Promise<T> {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      console.error(`Tauri command "${command}" failed:`, error);
      throw error;
    }
  }

  /**
   * Listens for an event from the Rust backend.
   * Automatically handles NgZone wrapping so UI updates work correctly.
   * @param event The event name.
   * @param handler The callback function.
   * @returns A promise that resolves to an unlisten function.
   */
  async on<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
    return await listen<T>(event, (eventObj: Event<T>) => {
      this.zone.run(() => {
        handler(eventObj.payload);
      });
    });
  }

  /**
   * Emits an event to the backend.
   * @param event The name of the event.
   * @param payload Optional payload to send with the event.
   */
  async emit<T>(event: string, payload?: T): Promise<void> {
    try {
      await emit(event, payload);
    } catch (error) {
      console.error(`Tauri emit "${event}" failed:`, error);
      throw error;
    }
  }

  async getAppVersion(): Promise<string> {
    return await getVersion();
  }

  async setZoom(factor: number): Promise<void> {
    await getCurrentWebview().setZoom(factor);
  }

  async openDialog(options: OpenDialogOptions): Promise<string | string[] | null> {
    return await open(options);
  }

  async saveDialog(options: any): Promise<string | null> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    return await save(options);
  }

  async openUrl(url: string): Promise<void> {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  }

  async clipboardWriteText(text: string): Promise<void> {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
  }
}
