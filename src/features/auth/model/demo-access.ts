// Explicit UI preview capability, separate from Identity authentication and server sessions.
export interface DemoCredentials {
  email: string;
  password: string;
}

export interface DemoAccess {
  readonly account: Readonly<DemoCredentials>;
  accepts(credentials: DemoCredentials): boolean;
}

export interface DemoLogin {
  readonly account: Readonly<DemoCredentials>;
  activate(credentials: DemoCredentials): boolean;
}
