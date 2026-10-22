const origin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5187';
const debug = process.env.BROWSER_DEBUG_ORIGIN || 'http://127.0.0.1:9227';
const backendUnavailable = process.argv.includes('--backend-unavailable');
const target = await (await fetch(debug + '/json/new?' + encodeURIComponent('about:blank'), {method:'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let next=0;const pending=new Map();const errors=[];
ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const job=pending.get(message.id);pending.delete(message.id);message.error?job?.reject(new Error(message.error.message)):job?.resolve(message.result);}else if(message.method==='Runtime.exceptionThrown'){errors.push(message.params.exceptionDetails.text);}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await call('Runtime.enable');await call('Page.enable');
const checks=[
 ['/welcome','Evidence and limitations'],['/pricing',backendUnavailable ? 'Request failed' : 'Billing is unavailable'],['/directory',backendUnavailable ? 'Request failed' : 'No records on this page.'],['/signin','Sign in'],['/admin','Sign in'],['/saved','Sign in'],['/mfa','challenge expired'],['/developers/docs','Investigation API'],['/shared#invalid-test-share',backendUnavailable ? 'Request failed' : 'shared investigation is unavailable']
];
let failed=0;
try{
 for(const[path,text]of checks){const startErrors=errors.length;await call('Page.navigate',{url:origin+path});let match=false;for(let i=0;i<150;i++){await sleep(200);try{match=await evaluate('document.body.innerText.toLowerCase().includes('+JSON.stringify(text.toLowerCase())+')');if(match)break;}catch{/* Navigation resets execution context. */}}
 const currentPath=await evaluate('location.pathname');const fragmentRemoved=path.startsWith('/shared')?await evaluate('location.hash === ""'):undefined;
 const ok=match&&errors.length===startErrors&&fragmentRemoved!==false;
 console.log(JSON.stringify({mode:backendUnavailable?'backend-unavailable':'live-backend',route:path.split('#')[0],renderedAt:currentPath,expectedContent:match,runtimeErrors:errors.length-startErrors,fragmentRemoved,pass:ok}));if(!ok)failed++;
 }
 await evaluate("localStorage.setItem('pc-session','old-private-state');localStorage.setItem('pc-data-saver','true')");
 await call('Page.navigate',{url:origin+'/signin'});await sleep(1200);
 const isolated=await evaluate("localStorage.getItem('pc-session')===null && localStorage.getItem('pc-data-saver')==='true'");
 const cacheEntries=await evaluate("(async()=>{const keys=await caches.keys();const urls=[];for(const key of keys){const cache=await caches.open(key);for(const request of await cache.keys())urls.push(request.url);}return urls.filter(url=>new URL(url).pathname.startsWith('/v1/'));})()");
 console.log(JSON.stringify({privateStateCleared:isolated,privateApiCacheEntries:cacheEntries.length,pass:isolated&&cacheEntries.length===0}));if(!isolated||cacheEntries.length)failed++;
 process.exitCode=failed?1:0;
}finally{await call('Page.close').catch(()=>{});ws.close();}
