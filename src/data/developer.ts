import type { ApiKey, ApiRequestLog, Webhook } from '../types/trust';

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  body: string;
  response: string;
}

export const apiEndpoints:ApiEndpoint[]=[
{id:'create',method:'POST',path:'/v1/investigations',title:'Create an investigation',description:'Start research using an authorized investigation scope. A queued response is not a completed result.',body:JSON.stringify({investigation_type:'general_research',user_prompt:'Research the public evidence for this opportunity.'},null,2),response:JSON.stringify({investigation:{investigation_id:'<uuid>',status:'queued'},dispatch:'queued'},null,2)},
{id:'list',method:'GET',path:'/v1/investigations?scope=own&limit=20',title:'List your investigations',description:'Own records with opaque next_cursor pagination.',body:'',response:JSON.stringify({investigations:[],next_cursor:null},null,2)},
{id:'detail',method:'GET',path:'/v1/investigations/{id}',title:'Get an investigation',description:'Read status, summary, capabilities and limitations for your investigation.',body:'',response:JSON.stringify({investigation:{investigation_id:'<uuid>',status:'queued'},targets:[],limitations:[]},null,2)},
{id:'findings',method:'GET',path:'/v1/investigations/{id}/findings?limit=20&offset=0',title:'Read findings',description:'Evidence findings retain their verification status and confidence.',body:'',response:JSON.stringify({findings:[],limitations:[]},null,2)},
{id:'sources',method:'GET',path:'/v1/investigations/{id}/sources?limit=20&offset=0',title:'Read sources',description:'Read sources attached to your investigation.',body:'',response:JSON.stringify({sources:[]},null,2)},
];

export const webhookEvents = ['check.completed', 'score.changed', 'report.created', 'verification.updated', 'dispute.updated'];

export const initialApiKeys: ApiKey[] = [
{ id: 'key-1', name: 'Production server', prefix: 'pc_live_9fK2', env: 'live', createdAt: '2026-07-01T10:00:00', lastUsed: '2026-10-04T08:59:00' },
{ id: 'key-2', name: 'Local testing', prefix: 'pc_test_Q81m', env: 'sandbox', createdAt: '2026-06-12T10:00:00', lastUsed: '2026-10-01T15:00:00' }];


export const initialRequestLogs: ApiRequestLog[] = [
{ id: 'rq-1', method: 'POST', path: '/v1/verify/business', status: 200, ms: 412, at: '2026-10-04T08:59:00' },
{ id: 'rq-2', method: 'POST', path: '/v1/verify/phone', status: 200, ms: 238, at: '2026-10-04T08:57:00' },
{ id: 'rq-3', method: 'POST', path: '/v1/verify/url', status: 422, ms: 41, at: '2026-10-04T08:51:00' },
{ id: 'rq-4', method: 'GET', path: '/v1/risk-score/ent_biz_7Hk2', status: 200, ms: 88, at: '2026-10-04T08:40:00' },
{ id: 'rq-5', method: 'POST', path: '/v1/verify/listing', status: 429, ms: 12, at: '2026-10-04T08:31:00' },
{ id: 'rq-6', method: 'POST', path: '/v1/verify/business', status: 200, ms: 501, at: '2026-10-04T08:12:00' }];


export const initialWebhooks: Webhook[] = [
{ id: 'wh-1', url: 'https://api.brightpath.ng/hooks/padicheck', events: ['check.completed', 'score.changed'], active: true, lastDelivery: { at: '2026-10-04T08:59:00', status: 200 } }];


export const usageByDay: number[] = Array(14).fill(0);

export const apiPlan = { name: 'Growth', monthlyLimit: 25000, ratePerMinute: 120, priceNaira: 150000 };