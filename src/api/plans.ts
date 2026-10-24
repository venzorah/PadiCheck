import {api} from './client';
export interface BillingPlan {
 plan_id:string;plan_key:string;audience:'consumer'|'business';display_name:string;tagline:string;currency:'NGN';
 monthly_amount:string;yearly_amount:string;monthly_credits:number;yearly_credits:number;features:string[];
 is_popular:boolean;is_published:boolean;revision:number;monthly_offer_key?:string|null;yearly_offer_key?:string|null;monthly_available?:boolean;yearly_available?:boolean;
}
export type PlanInput=Pick<BillingPlan,'plan_key'|'audience'|'display_name'|'tagline'|'currency'|'monthly_amount'|'yearly_amount'|'monthly_credits'|'yearly_credits'|'features'|'is_popular'|'is_published'>;
export const plansApi={
 create:(json:PlanInput)=>api<{plan:BillingPlan}>('/v1/admin/billing/plans',{auth:true,method:'POST',json}),
 save:(plan:BillingPlan,json:PlanInput)=>api<{plan:BillingPlan}>(`/v1/admin/billing/plans/${plan.plan_id}`,{auth:true,method:'PUT',json:{...json,revision:plan.revision}}),
 enable:(id:string)=>api<{enabled:boolean;manual_renewal:boolean}>(`/v1/admin/billing/plans/${id}/enable-checkout`,{auth:true,method:'POST',json:{acknowledge_manual_renewal:true}}),
};
