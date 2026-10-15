import type { ShellSnapshot } from '../features/shell/model/shell';
import type { DemoLogin } from '../features/auth/model/demo-access';
export interface RouteContext {
  viewer: ShellSnapshot['viewer'];
  previewEnabled: boolean;
  demoLogin?: DemoLogin;
}
