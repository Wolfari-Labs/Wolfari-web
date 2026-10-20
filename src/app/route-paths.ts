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
  map: (id: string) => `/trips/${encodeURIComponent(id)}/map`,
  members: (id: string) => `/trips/${encodeURIComponent(id)}/members`,
  fund: (id: string) => `/trips/${encodeURIComponent(id)}/fund`,
  priceWatch: (id: string) => `/trips/${encodeURIComponent(id)}/price-watch`,
};
