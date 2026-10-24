export function billingAmount(amount:string,currency:string){
 const value=Number(amount);
 if(!Number.isFinite(value)||!/^\d+(\.\d+)?$/.test(amount)||!/^[A-Z]{3}$/.test(currency))return 'Amount unavailable';
 try{return new Intl.NumberFormat('en-NG',{style:'currency',currency}).format(value);}catch{return 'Amount unavailable';}
}
