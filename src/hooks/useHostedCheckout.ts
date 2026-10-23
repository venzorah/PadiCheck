import { useRef, useState } from 'react';
import { billingApi } from '../api/billing';
import { safeHttpUrl } from '../utils/investigations';
export function useHostedCheckout() {
  const attempts=useRef(new Map<string,string>());const lock=useRef(false);
  const [busy,setBusy]=useState(false);
  const start=async(offerKey:string)=>{
    if(lock.current)return;lock.current=true;setBusy(true);
    try{let requestKey=attempts.current.get(offerKey);if(!requestKey){requestKey=crypto.randomUUID();attempts.current.set(offerKey,requestKey);}
      const result=await billingApi.create(offerKey,requestKey);sessionStorage.setItem('pc-checkout-id',result.checkout.billing_checkout_id);
      const url=safeHttpUrl(result.checkout.checkout_url);if(result.checkout.status==='open'&&url)window.location.assign(url);
      else throw new Error('Checkout is not open. Check its status in Billing before starting another purchase.');
    }finally{lock.current=false;setBusy(false);}
  };return {start,busy};
}
