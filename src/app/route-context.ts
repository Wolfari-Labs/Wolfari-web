import type { ShellSnapshot } from '../features/shell/model/shell';
export interface RouteContext {
  viewer: ShellSnapshot['viewer'];
  previewEnabled: boolean;
}
