import {useApiData} from './useApiData';
import type {CreditPolicyResponse,CreditType} from '../api/credits';
export function useCreditCost(kind:CreditType,credits:number){
 const state=useApiData<CreditPolicyResponse>('/v1/credits/policy',false);
 const cost=state.data?.enabled?state.data.policy?.costs[kind]??NaN:Number.isFinite(credits)?1:NaN;
 return {...state,cost,enabled:Boolean(state.data?.enabled)};
}
