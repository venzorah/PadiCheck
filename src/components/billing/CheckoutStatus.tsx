import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { billingApi, type BillingCheckout } from '../../api/billing';
import { apiErrorMessage, ApiError } from '../../api/client';
import { useUser } from '../../contexts/UserContext';
export function CheckoutStatus({onPaid}:{onPaid?:()=>void}={}){
 const {session}=useUser();const [id,setId]=useState(()=>sessionStorage.getItem('pc-checkout-id'));const [checkout,setCheckout]=useState<BillingCheckout|null>(null);const [error,setError]=useState('');
 const notified=useRef<string|null>(null);
 useEffect(()=>{if(id&&checkout?.status==='paid'&&notified.current!==id){notified.current=id;onPaid?.();}},[id,checkout?.status,onPaid]);
 useEffect(()=>{if(!id||!session)return;const abort=new AbortController();let timer:ReturnType<typeof setTimeout>;let count=0;
 const read=async()=>{try{const result=await billingApi.checkout(id,abort.signal);if(abort.signal.aborted)return;setCheckout(result.checkout);setError('');if(++count<60&&['open','pending','paid'].includes(result.checkout.status))timer=setTimeout(()=>void read(),5000);}catch(failure){if(abort.signal.aborted)return;setError(apiErrorMessage(failure));if(!(failure instanceof ApiError&&[401,403,404].includes(failure.status)))timer=setTimeout(()=>void read(),15000);}};void read();return()=>{abort.abort();clearTimeout(timer);};},[id,session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
 if(!id)return null;return <section className="rounded-3xl bg-surface p-5"><h2 className="font-semibold text-ink">Checkout status</h2>{session?<p className="mt-2 text-ink">{checkout?.status||'Checking payment...'}</p>:<Link to="/signin" state={{from:'/account/billing'}} className="text-brand-dark">Sign in to check payment</Link>}<p className="mt-2 text-sm text-muted">Payment and allowances are confirmed by the backend. Returning here does not prove payment.</p>{error&&<p role="alert" className="mt-2 text-sm text-danger">{error}</p>}<button className="mt-3 text-sm font-semibold text-muted" onClick={()=>{sessionStorage.removeItem('pc-checkout-id');setId(null);}}>Dismiss</button></section>;
}
