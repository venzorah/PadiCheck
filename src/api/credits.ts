import {api} from './client';
import type {CreditTransaction} from '../types/check';
export const creditLabels = {
 company_research:'Business checks',phone_lookup:'Phone checks',property:'Property checks',job_search:'Job checks',
 web_analysis:'Website and link checks',contract_review:'Contract reviews',general_research:'General research',
 shopping:'Shopping checks',freelance:'Freelance checks',person:'Person checks',social:'Social profile checks',listing:'Listing checks',
};
export type CreditType=keyof typeof creditLabels;
export interface CreditPolicy {environment:string;welcome_credits:number;costs:Record<CreditType,number>;revision:number;updated_at:string;}
export interface CreditPolicyResponse {enabled:boolean;policy:CreditPolicy|null;}
export interface CreditBalance {enabled:boolean;available_units:number;transactions:CreditTransaction[];}
export const creditsApi={
 save:(policy:CreditPolicy)=>api<CreditPolicyResponse>('/v1/admin/credits/policy',{auth:true,method:'PUT',json:{welcome_credits:policy.welcome_credits,costs:policy.costs,revision:policy.revision}}),
};
