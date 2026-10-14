// One store per application instance; never serialize to browser storage or logs.
export function createAccessTokenStore() {
  let token: string | null = null;
  return {
    get: () => token,
    set: (value: string) => {
      token = value;
    },
    clear: () => {
      token = null;
    },
  };
}
