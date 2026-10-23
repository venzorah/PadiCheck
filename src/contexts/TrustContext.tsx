import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '../api/client';
import { useApiData } from '../hooks/useApiData';
import { useUser } from './UserContext';
import { notificationsApi, type AppNotice } from '../api/notifications';
import { businessTeamsApi } from '../api/businessTeams';
import type { PublicBusiness, PublicBusinessDetail } from '../api/directory';
import type { ApiKeyRecord } from '../api/apiKeys';
import { businessView, businessEntity, emptyBusiness, reportView, disputeView, notificationView } from '../utils/presentationAdapters';
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
    saveBusiness: (b: Business) => Promise<void>;
    reviews: Review[];
    saveReview: (r: Review) => void;
    reports: UserReport[];
    addReport: (r: Omit<UserReport, 'id' | 'at' | 'updates' | 'status'>) => Promise<UserReport>;
    updateReport: (id: string, patch: Partial<UserReport>, update?: Omit<ReportUpdate, 'at'>) => void;
    disputes: Dispute[];
    addDispute: (d: Omit<Dispute, 'id' | 'at' | 'status' | 'messages'>) => Promise<Dispute>;
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

const Context = createContext<TrustValue | null>(null);
const unavailable = (): never => { throw new Error('This action is not available from the backend yet.'); };
const scoreConfig: ScoreConfig = {version:'Unavailable',bands:[],weights:{identity:0,business:0,website:0,phone:0,social:0,reports:0,reviews:0,history:0,ai:0},minConfidenceEvidence:0,rules:[],history:[]};
export function TrustProvider({children}:{children:ReactNode}) {
  const { session, hasPermission }=useUser(); const location=useLocation();
  const params=new URLSearchParams(location.search); const selected=params.get('business_profile_id');
  const publicId=location.pathname.startsWith('/b/')?decodeURIComponent(location.pathname.slice(3)):null;
  const directory=useApiData<{businesses:PublicBusiness[]}>('/v1/directory?limit=100&offset=0',false);
  const detail=useApiData<PublicBusinessDetail>((publicId||selected)?'/v1/directory/'+encodeURIComponent(publicId||selected!):null,false);
  const notices=useApiData<{notifications:AppNotice[]}>(session?'/v1/me/notifications?limit=100&offset=0':null);
  const keys=useApiData<{api_keys:ApiKeyRecord[]}>(session?'/v1/me/api-keys':null);
  const reportData=useApiData<{reports:Record<string,unknown>[]}>(session?(location.pathname.startsWith('/admin')&&hasPermission('reports.moderate')?'/v1/admin/reports':selected&&location.pathname.startsWith('/business')?'/v1/directory/'+selected+'/reports':'/v1/reports')+'?limit=100&offset=0':null);
  const disputeData=useApiData<{disputes:Record<string,unknown>[]}>(session?(location.pathname.startsWith('/admin')&&hasPermission('disputes.resolve')?'/v1/admin/disputes':'/v1/disputes')+'?limit=100&offset=0':null);
  useEffect(()=>{const refresh=()=>{reportData.refresh();disputeData.refresh();directory.refresh();verificationData.refresh();};window.addEventListener('padicheck-data-updated',refresh);return()=>window.removeEventListener('padicheck-data-updated',refresh);},[]); // eslint-disable-line react-hooks/exhaustive-deps
  const verificationData=useApiData<{verifications:Record<string,unknown>[]}>(session&&location.pathname.startsWith('/admin')&&hasPermission('verifications.review')?'/v1/admin/verifications?limit=100&offset=0':null);
  const businesses=useMemo(()=>{const list=(directory.data?.businesses||[]).map(row=>businessView(row));if(detail.data){const b=businessView(detail.data.business,detail.data);return [b,...list.filter(row=>row.id!==b.id)];}const additional=(verificationData.data?.verifications||[]).filter(row=>!list.some(b=>b.id===row.business_profile_id)).map(row=>({...emptyBusiness,id:String(row.business_profile_id),slug:String(row.business_profile_id),name:String(row.canonical_name||row.business_name||'Business '+row.business_profile_id)}));return [...list,...additional].map(b=>{const row=verificationData.data?.verifications.find(v=>v.business_profile_id===b.id);return row?{...b,verification:(row.status==='approved'?'verified':row.status==='rejected'?'rejected':'review') as Business['verification'],submittedAt:String(row.submitted_at||''),lastVerifiedAt:row.reviewed_at?String(row.reviewed_at):undefined}:b;});},[directory.data,detail.data,verificationData.data]);
  const myBusiness=businesses.find(row=>row.id===selected)||emptyBusiness;
  const entities=useMemo(()=>businesses.map(businessEntity),[businesses]);
  const reports=(reportData.data?.reports||[]).map(reportView);const disputes=(disputeData.data?.disputes||[]).map(disputeView);
  const notifications=(notices.data?.notifications||[]).map(notificationView);
  const markRead=(id:string)=>{void notificationsApi.read(id).then(notices.refresh).catch(error=>toast.error(apiErrorMessage(error)));};
  const value:TrustValue={
    entities,getEntity:id=>entities.find(row=>row.id===id),upsertEntity:()=>undefined,myCheckIds:[],recordCheck:()=>undefined,savedEntityIds:[],toggleSavedEntity:unavailable,
    businesses,myBusiness,getBusinessBySlug:slug=>businesses.find(row=>row.slug===slug),getBusinessByCertificate:()=>undefined,
    saveBusiness:async b=>{if(!b.id)throw new Error('Choose a business from the directory first.');await businessTeamsApi.profile(b.id,b.category,b.description||null);detail.refresh();directory.refresh();},
    reviews:[],saveReview:unavailable,reports,
    addReport:async payload=>{const result=await api<{report:Record<string,unknown>}>('/v1/reports',{auth:true,method:'POST',json:{entity_id:payload.entityId,report_category:payload.category,title:payload.entityName,description:payload.description,media_ids:payload.evidence}});reportData.refresh();return reportView(result.report);},
    updateReport:unavailable,disputes,
    addDispute:async payload=>{const result=await api<{dispute:Record<string,unknown>}>('/v1/reports/'+encodeURIComponent(payload.reportId)+'/disputes',{auth:true,method:'POST',json:{reason:payload.request+': '+payload.statement}});disputeData.refresh();return disputeView(result.dispute);},
    updateDispute:unavailable,aiFlags:[],updateAiFlag:unavailable,scoreConfig,saveScoreConfig:unavailable,
    apiKeys:(keys.data?.api_keys||[]).map(row=>({id:row.api_key_id,name:row.name,prefix:row.key_prefix,env:'live',createdAt:row.created_at,lastUsed:row.last_used_at||undefined,revoked:!!row.revoked_at})),saveApiKey:unavailable,
    requestLogs:[],logRequest:unavailable,webhooks:[],saveWebhook:unavailable,removeWebhook:unavailable,
    notifications,unreadCount:notifications.filter(row=>!row.read).length,notify:()=>undefined,markRead,markAllRead:()=>{void Promise.all((notices.data?.notifications||[]).filter(row=>!row.read_at).map(row=>notificationsApi.read(row.notification_id))).then(notices.refresh).catch(error=>toast.error(apiErrorMessage(error)));},
    subscription:{planId:'free',period:'monthly',status:'active',renewsAt:''},setSubscription:unavailable,invoices:[],addInvoice:unavailable,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTrust():TrustValue {const context=useContext(Context);if(!context)throw new Error('useTrust requires TrustProvider');return context;}
