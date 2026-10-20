// Technical routes already proposed by implementation-baseline.md; feature bodies deferred.
export const paths = {
  admin: '/admin',
  home: '/',
  trips: '/trips',
  newTrip: '/trips/new',
  profile: '/profile',
  login: '/login',
  register: '/register',
  trip: (id: string) => `/trips/${encodeURIComponent(id)}`,
  plan: (id: string) => `/trips/${encodeURIComponent(id)}/plan`,
  map: (id: string) => `/trips/${encodeURIComponent(id)}/map`,
  dressCode: (id: string) => `/trips/${encodeURIComponent(id)}/dress-code`,
  packing: (id: string) => `/trips/${encodeURIComponent(id)}/packing`,
  members: (id: string) => `/trips/${encodeURIComponent(id)}/members`,
  fund: (id: string) => `/trips/${encodeURIComponent(id)}/fund`,
  priceWatch: (id: string) => `/trips/${encodeURIComponent(id)}/price-watch`,
};
