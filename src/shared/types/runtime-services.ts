import type { createNotificationRepository } from '../../infrastructure/repositories/notification.gateway-repository';
import type { createRuntimePriceWatchRepository } from '../../infrastructure/repositories/runtime-price-watch.gateway-repository';
export interface RuntimeServices {
  notifications: ReturnType<typeof createNotificationRepository>;
  priceWatch: ReturnType<typeof createRuntimePriceWatchRepository>;
}
