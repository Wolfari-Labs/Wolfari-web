import type { createNotificationRepository } from '../../infrastructure/repositories/notification.gateway-repository';
import type { createRuntimePriceWatchRepository } from '../../infrastructure/repositories/runtime-price-watch.gateway-repository';
export interface RuntimeServices {
  travel?: import('../../features/plan/model/travel').TravelRepository;
  notifications: ReturnType<typeof createNotificationRepository>;
  priceWatch: ReturnType<typeof createRuntimePriceWatchRepository>;
}
