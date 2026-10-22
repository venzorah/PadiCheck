import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
import ts from 'typescript';
const encode = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const read = path => readFile(new URL('../src/'+path,import.meta.url),'utf8');
const clientURL=encode((await read('api/client.ts')).replace('import.meta.env.VITE_API_BASE_URL',"'https://api.test'"));
const client=await import(clientURL);
const load=async path=>import(encode((await read(path)).replace(/(['"])\.\/client\1/,JSON.stringify(clientURL))));
const {authApi}=await load('api/auth.ts');
const {securityApi}=await load('api/security.ts');
const {bookmarksApi}=await load('api/bookmarks.ts');
const {notificationsApi}=await load('api/notifications.ts');
const {businessTeamsApi}=await load('api/businessTeams.ts');
const {apiKeysApi}=await load('api/apiKeys.ts');
const {billingApi}=await load('api/billing.ts');
const {dispatchLoginResponse,loginDestination}=await import(encode(await read('utils/authFlow.ts')));
const {buildServiceWorkerSource}=await import(encode(await read('utils/serviceWorker.ts')));
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;client.setAccessToken(null);});
const session={access_token:'test-session',token_type:'Bearer',expires_in:900};
for(const method of ['password','Google'])test(method+' MFA challenges never call /me or establish bearer access',async()=>{
 let accepted=0,challenged=0;
 const complete=await dispatchLoginResponse({mfa_required:true,challenge_token:'test-factor-challenge',expires_in:300},{challenge:challenge=>{challenged++;assert.equal(challenge.expires_in,300);},access:async()=>{accepted++;}});
 assert.equal(complete,false);assert.equal(challenged,1);assert.equal(accepted,0);assert.equal(loginDestination(complete,'/admin'),'/mfa');
});
test('access login waits for session acceptance and validates internal return routes',async()=>{
 let accepted=false;assert.equal(await dispatchLoginResponse(session,{challenge:assert.fail,access:async value=>{assert.equal(value.token_type,'Bearer');accepted=true;}}),true);assert.equal(accepted,true);
 assert.equal(loginDestination(true,'//external.test'),'/');assert.equal(loginDestination(true,'/account/security'),'/account/security');
 await assert.rejects(dispatchLoginResponse({mfa_required:true,challenge_token:'',expires_in:300},{challenge:assert.fail,access:assert.fail}));
});
test('MFA exchange is public, preserves leading zeros and keeps login errors separate',async()=>{
 client.setAccessToken('existing');let notifications=0;const stop=client.onSessionExpired(()=>notifications++);
 globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).pathname,'/v1/auth/mfa/verify');assert.equal(options.headers.has('Authorization'),false);assert.deepEqual(JSON.parse(options.body),{challenge_token:'challenge',code:'012345'});return Response.json({error:{code:'invalid_mfa_code',message:'Invalid factor'}},{status:401});};
 await assert.rejects(authApi.verifyMfa('challenge','012345'),{code:'invalid_mfa_code'});assert.equal(notifications,0);stop();
});
test('session revocation and security management use user JWT and no invented device fields',async()=>{
 client.setAccessToken('user-session');const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});assert.equal(options.headers.get('Authorization'),'Bearer user-session');return options.method==='DELETE'||url.endsWith('/logout-all')?new Response(null,{status:204}):Response.json({enabled:true,recovery_codes_remaining:10});};
 await securityApi.sessions();await securityApi.revoke('session-id');await securityApi.logoutAll();await securityApi.confirm('012345');await securityApi.disable('abcdef012345abcdef012345');await securityApi.regenerate('654321');
 assert.equal(calls[0].options.method,'GET');assert.equal(calls[1].options.method,'DELETE');assert.deepEqual(JSON.parse(calls[3].options.body),{code:'012345'});
 assert.equal(calls.length,6);
});
test('bookmarks use investigation IDs; notifications use supported event kinds and owned read endpoints',async()=>{
 client.setAccessToken('user-session');const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url:new URL(url),options});return options.method==='DELETE'?new Response(null,{status:204}):Response.json({bookmarked:true});};
 await bookmarksApi.add('investigation-id');await bookmarksApi.remove('investigation-id');await bookmarksApi.list(20);await notificationsApi.list(40,undefined,true);await notificationsApi.read('notice-id');await notificationsApi.setPreference('business.invitation',false);
 assert.equal(calls[0].url.pathname,'/v1/investigations/investigation-id/bookmark');assert.equal(calls[2].url.searchParams.get('offset'),'20');assert.equal(calls[3].url.searchParams.get('unread_only'),'true');assert.deepEqual(JSON.parse(calls[5].options.body),{notification_type:'business.invitation',enabled:false});
});
test('team invitation acceptance and scoped roles never grant staff authority',async()=>{
 client.setAccessToken('owner');const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return options.method==='DELETE'?new Response(null,{status:204}):Response.json({delivery:'in_app',accepted:true});};
 await businessTeamsApi.invite('business-id','recipient@example.test','editor');await businessTeamsApi.role('business-id','member-id','viewer');await businessTeamsApi.accept('invitation-id');await businessTeamsApi.profile('business-id','Services',null);
 assert.deepEqual(JSON.parse(calls[0].options.body),{email:'recipient@example.test',member_role:'editor'});assert.deepEqual(JSON.parse(calls[1].options.body),{member_role:'viewer'});assert.ok(calls[2].url.endsWith('/v1/me/business-invitations/invitation-id/accept'));assert.deepEqual(JSON.parse(calls[3].options.body),{business_category:'Services',profile_description:null});
});
test('key lifecycle uses bearer management and returns one-time secrets without using X-API-Key',async()=>{
 client.setAccessToken('owner');const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});assert.equal(options.headers.get('X-API-Key'),null);return options.method==='DELETE'?new Response(null,{status:204}):Response.json({api_key:{api_key_id:'key-id'},secret:'one-time-test-secret'});};
 const key=await apiKeysApi.create('Server',['investigations:read'],30);assert.equal(typeof key.secret,'string');await apiKeysApi.rotate('key-id');await apiKeysApi.revoke('key-id');assert.deepEqual(JSON.parse(calls[0].options.body),{name:'Server',scopes:['investigations:read'],expires_in_days:30});assert.equal(calls[1].options.method,'POST');assert.equal(calls[2].options.method,'DELETE');
});
test('checkout retries reuse a caller-owned request key and never submit prices or redirect claims',async()=>{
 client.setAccessToken('customer');const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({checkout:{billing_checkout_id:'local-id',status:'open',checkout_url:'https://checkout.test/path'}});};
 await billingApi.create('offer','same-request-key');await billingApi.create('offer','same-request-key');await billingApi.checkout('local-id');await billingApi.portal('subscription-id');assert.deepEqual(JSON.parse(calls[0].options.body),{offer_key:'offer',request_key:'same-request-key'});assert.equal(calls[0].options.body,calls[1].options.body);assert.ok(calls[2].url.endsWith('/checkouts/local-id'));assert.deepEqual(JSON.parse(calls[3].options.body),{billing_subscription_id:'subscription-id'});
});
function workerHarness(app='consumer'){
 const events={};let cacheOpens=0;const timers=[];
 const context=createContext({URL,URLSearchParams,Request,Response,FormData,File,crypto:globalThis.crypto,setTimeout:callback=>{timers.push(callback);return timers.length;},self:{location:{origin:'https://app.test'},addEventListener:(event,handler)=>{events[event]=handler;}},caches:{open:async()=>{cacheOpens++;return {match:async()=>undefined,put:async()=>{}};},keys:async()=>[]},fetch:async()=>new Response('static')});
 new Script(buildServiceWorkerSource(app,'test-version',app==='consumer'?'/':'/admin/')).runInContext(context);
 return {events,opens:()=>cacheOpens};
}
test('both generated service workers parse and leave /v1, signed downloads and authorized data network-only',async()=>{
 for(const app of ['consumer','admin']){const worker=workerHarness(app);for(const path of ['/v1/me/api-keys','/v1/private/image.png','/admin/image.png?token=temporary','/admin/private.png']){
 let handled=false;const headers=path==='/admin/private.png'?{Authorization:'Bearer example'}:{};
 worker.events.fetch({request:new Request('https://app.test'+path,{headers}),respondWith:()=>{handled=true;}});assert.equal(handled,false);}
 assert.equal(worker.opens(),0);}
});
test('share files live only in worker memory, are consumed once and clear on logout',async()=>{
 const worker=workerHarness();const form=new FormData();form.append('files',new File(['private'],'evidence.pdf',{type:'application/pdf'}));
 let response;worker.events.fetch({request:new Request('https://app.test/share-target',{method:'POST',body:form}),respondWith:value=>{response=value;}});
 const redirect=await response;const id=new URL(redirect.headers.get('Location')).searchParams.get('share_id');assert.ok(id);let received;
 const read=()=>worker.events.message({data:{type:'READ_SHARE_INBOX',id},ports:[{postMessage:files=>{received=files;}}]});read();assert.equal(received.length,1);read();assert.equal(received.length,0);
 worker.events.message({data:{type:'CLEAR_PRIVATE_STATE'}});assert.equal(worker.opens(),0);
});
const {reviewTransitions}=await import(encode(await read('utils/reviewTransitions.ts')));
test('staff review options preserve terminal states and separate decision workflows',()=>{
 assert.deepEqual(reviewTransitions('verifications','pending'),['in_review','approved','rejected']);
 assert.deepEqual(reviewTransitions('reports','published'),['under_review','rejected']);
 assert.deepEqual(reviewTransitions('disputes','under_review'),['resolved','rejected']);
 for(const kind of ['verifications','reports','disputes'])assert.deepEqual(reviewTransitions(kind,'withdrawn'),[]);
 assert.deepEqual(reviewTransitions('verifications','approved'),[]);assert.deepEqual(reviewTransitions('disputes','resolved'),[]);
});
test('logout/account cleanup removes private local/session/share data while retaining approved UI preferences and checkout UUID',async()=>{
 const shareURL=encode(await read('utils/shareInbox.ts'));const share=await import(shareURL);
 const privacy=await import(encode((await read('utils/privateState.ts')).replace(/(['"])\.\/shareInbox\1/,JSON.stringify(shareURL))));
 const names=['localStorage','sessionStorage','navigator','caches'];const descriptors=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const storage=values=>Object.assign({removeItem(key){delete this[key];}},values);const local=storage({'pc-session':'old','pc-trust-entities':'old','pc-theme-v2':'dark','pc-data-saver':'true'});const temporary=storage({'pc-old-token':'old','pc-checkout-id':'non-secret-local-uuid'});const deleted=[];const messages=[];
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:local});Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:temporary});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{postMessage:message=>messages.push(message)}}}});
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{keys:async()=>['pc-share-inbox','pc-private-data','pc-consumer-shell'],delete:async key=>{deleted.push(key);return true;}}});
  share.putSharedFiles([new File(['fixture'],'evidence.pdf')]);privacy.clearPrivateState();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(local['pc-session'],undefined);assert.equal(local['pc-trust-entities'],undefined);assert.equal(local['pc-theme-v2'],'dark');assert.equal(local['pc-data-saver'],'true');assert.equal(temporary['pc-old-token'],undefined);assert.equal(temporary['pc-checkout-id'],'non-secret-local-uuid');assert.equal(share.takeSharedFiles().length,0);assert.equal(messages[0].type,'CLEAR_PRIVATE_STATE');assert.deepEqual(deleted.sort(),['pc-private-data','pc-share-inbox']);
 }finally{for(const name of names){const descriptor=descriptors.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});
