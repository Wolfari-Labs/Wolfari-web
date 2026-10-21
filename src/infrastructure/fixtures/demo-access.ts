import type { DemoAccess } from '../../features/auth/model/demo-access';

// Public sample credentials. Loaded only by the development/explicit fixture preview bootstrap.
export function createFixtureDemoAccess(): DemoAccess {
  const account = Object.freeze({
    email: 'trang.nguyen@example.com',
    password: 'WolfariDemo2026!',
  });
  return {
    account,
    accepts: ({ email, password }) =>
      email.trim().toLowerCase() === account.email && password === account.password,
  };
}
