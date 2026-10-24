import {plans} from '../data/plans';
import type {PlanInput} from '../api/plans';
export function planDraft(key:string|null):PlanInput|null{
 const plan=plans.find(row=>row.id===key);if(!plan)return null;
 const credits=plan.id==='plus'?30:plan.id==='pro'?150:0;
 return {plan_key:plan.id,audience:plan.audience,display_name:plan.name,tagline:plan.tagline,currency:'NGN',monthly_amount:plan.monthly.toFixed(2),yearly_amount:plan.yearly.toFixed(2),monthly_credits:credits,yearly_credits:credits*12,features:plan.audience==='consumer'?plan.features.slice(1):plan.features,is_popular:Boolean(plan.highlight),is_published:false};
}
