import type { createNotificationRepository } from '../../infrastructure/repositories/notification.gateway-repository';
import type { createRuntimePriceWatchRepository } from '../../infrastructure/repositories/runtime-price-watch.gateway-repository';
import type { createPlacesRepository } from '../../infrastructure/repositories/places.gateway-repository';
export interface RuntimeServices {
  browserPush?: import('../../features/notifications/browser-push').BrowserPush;
  travel?: import('../../features/plan/model/travel').TravelRepository;
  places?: ReturnType<typeof createPlacesRepository>;
  weather?: import('../../features/weather/weather').WeatherRepository;
  notifications: ReturnType<typeof createNotificationRepository>;
  priceWatch: ReturnType<typeof createRuntimePriceWatchRepository>;
}
