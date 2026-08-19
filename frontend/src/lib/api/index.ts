import type { ApiClient } from './client';
import { createHttpApiClient } from './httpClient';
import { createMockApiClient } from '../mock/client';

/**
 * Único ponto de troca entre mock e API real. Defina VITE_API_BASE_URL
 * no .env pra apontar pro backend (Fase 6) quando ele existir; sem isso,
 * cai no mock em memória.
 */
export function createApiClient(): ApiClient {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (baseUrl) {
    return createHttpApiClient(baseUrl);
  }
  return createMockApiClient();
}

export type { ApiClient } from './client';
export * from '../../types/api';
