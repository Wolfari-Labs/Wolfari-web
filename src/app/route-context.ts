import type { AdminSection, ShellSnapshot } from '../features/shell/model/shell';
import type { DemoLogin } from '../features/auth/model/demo-access';
export interface RouteContext {
  viewer: ShellSnapshot['viewer'];
  previewEnabled: boolean;
  adminSection?: AdminSection;
  demoLogin?: DemoLogin;
}
