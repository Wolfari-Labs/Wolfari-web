import type { createNotificationRepository } from '../../infrastructure/repositories/notification.gateway-repository';
import type { createRuntimePriceWatchRepository } from '../../infrastructure/repositories/runtime-price-watch.gateway-repository';
import type { createPlacesRepository } from '../../infrastructure/repositories/places.gateway-repository';
export interface RuntimeServices {
  places?: ReturnType<typeof createPlacesRepository>;
  notifications: ReturnType<typeof createNotificationRepository>;
  priceWatch: ReturnType<typeof createRuntimePriceWatchRepository>;
}
