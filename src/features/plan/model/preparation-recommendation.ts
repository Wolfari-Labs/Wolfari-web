import type { PlanCommandResult } from './plan';

export type PreparationRecommendationType = 'PACKING' | 'DRESS_CODE' | 'ALL';
export interface PreparationRecommendationItem {
  id: string;
  kind: 'PACKING' | 'DRESS_CODE';
  title: string;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  activityId: string | null;
  date: string | null;
  reasons: string[];
  warnings: string[];
}
export interface PreparationRecommendation {
  id: string;
  tripId: string;
  type: PreparationRecommendationType;
  status: 'PREVIEWED' | 'APPLIED' | 'REJECTED' | 'EXPIRED';
  basePlanVersion: number;
  appliedPlanVersion: number | null;
  expiresAt: string;
  canApply: boolean;
  items: PreparationRecommendationItem[];
  warnings: string[];
  sources: {
    provider: string;
    stale: boolean;
    isMock: boolean;
    attribution: { text: string; url: string }[];
  }[];
  applied: {
    createdCount: number;
    skippedCount: number;
  } | null;
}
export interface PreparationRecommendationsRepository {
  preview(request: {
    tripId: string;
    type: PreparationRecommendationType;
    date?: string;
    activityIds?: readonly string[];
    signal: AbortSignal;
  }): Promise<PreparationRecommendation>;
  apply(request: {
    tripId: string;
    recommendationId: string;
    itemIds: readonly string[];
    expectedPlanVersion: number;
    idempotencyKey: string;
    signal: AbortSignal;
  }): Promise<PlanCommandResult<PreparationRecommendation>>;
  ignore(request: {
    tripId: string;
    recommendationId: string;
    signal: AbortSignal;
  }): Promise<PreparationRecommendation>;
}
