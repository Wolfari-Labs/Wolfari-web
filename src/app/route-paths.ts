// Technical routes already proposed by implementation-baseline.md; feature bodies deferred.
export const paths = {
  admin: '/admin',
  home: '/',
  trips: '/trips',
  profile: '/profile',
  login: '/login',
  register: '/register',
  trip: (id: string) => `/trips/${encodeURIComponent(id)}`,
  plan: (id: string) => `/trips/${encodeURIComponent(id)}/plan`,
  members: (id: string) => `/trips/${encodeURIComponent(id)}/members`,
};
