import { createContext, useContext } from 'react';
import type { RuntimeServices } from '../shared/types/runtime-services';
export const GatewayContext = createContext<RuntimeServices | null>(null);
export const useRuntimeServices = () => useContext(GatewayContext);
