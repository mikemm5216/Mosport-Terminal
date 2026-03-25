export type SportType = 'football' | 'basketball' | 'baseball';
export type IngestionStatus = 'pending' | 'running' | 'failed' | 'done';

export interface IngestionJob {
  sport: SportType;
  league: string;
  page: number;
  priority: number;
}

export interface IngestionMetrics {
  successCount: number;
  failureCount: number;
  retryCount: number;
  skippedUnchangedCount: number;
  alignmentFailures: number;
}

export interface RawEventPayload {
  extId: string;
  provider: string;
  sport: string;
  league: string;
  data: any;
}
