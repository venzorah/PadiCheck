import type { ReactNode } from 'react';
import type { AiFlag, ApiKey, ApiRequestLog, AppNotification, Business, Dispute, DisputeMessage, Invoice, ReportUpdate, Review, ScoreConfig, Subscription, TrustEntity, UserReport, Webhook } from '../types/trust';
interface TrustValue {
    entities: TrustEntity[];
    getEntity: (id: string) => TrustEntity | undefined;
    upsertEntity: (e: TrustEntity) => void;
    myCheckIds: string[];
    recordCheck: (id: string) => void;
    savedEntityIds: string[];
    toggleSavedEntity: (id: string) => void;
    businesses: Business[];
    myBusiness: Business;
    getBusinessBySlug: (slug: string) => Business | undefined;
    getBusinessByCertificate: (id: string) => Business | undefined;
    saveBusiness: (b: Business) => void;
    reviews: Review[];
    saveReview: (r: Review) => void;
    reports: UserReport[];
    addReport: (r: Omit<UserReport, 'id' | 'at' | 'updates' | 'status'>) => UserReport;
    updateReport: (id: string, patch: Partial<UserReport>, update?: Omit<ReportUpdate, 'at'>) => void;
    disputes: Dispute[];
    addDispute: (d: Omit<Dispute, 'id' | 'at' | 'status' | 'messages'>) => Dispute;
    updateDispute: (id: string, patch: Partial<Dispute>, message?: Omit<DisputeMessage, 'at'>) => void;
    aiFlags: AiFlag[];
    updateAiFlag: (id: string, patch: Partial<AiFlag>) => void;
    scoreConfig: ScoreConfig;
    saveScoreConfig: (c: ScoreConfig) => void;
    apiKeys: ApiKey[];
    saveApiKey: (k: ApiKey) => void;
    requestLogs: ApiRequestLog[];
    logRequest: (r: Omit<ApiRequestLog, 'id' | 'at'>) => void;
    webhooks: Webhook[];
    saveWebhook: (w: Webhook) => void;
    removeWebhook: (id: string) => void;
    notifications: AppNotification[];
    unreadCount: number;
    notify: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    subscription: Subscription;
    setSubscription: (s: Subscription) => void;
    invoices: Invoice[];
    addInvoice: (i: Invoice) => void;
}
/** Retained type boundary for retired preview components; no fixtures or private persistence. */
export function TrustProvider({ children }: {
    children: ReactNode;
}) { return <>{children}</>; }
export function useTrust(): TrustValue { throw new Error('The legacy demo store is unavailable. Use the typed API clients and server-backed screens.'); }
