// Isolated browser regression tests with explicitly mocked HTTP responses.
// These do not prove live mailbox, Google, payment or provider acceptance.
const origin=process.env.FRONTEND_ORIGIN||'http://127.0.0.1:5187';
const debug=process.env.BROWSER_DEBUG_ORIGIN||'http://127.0.0.1:9227';
const target=await(await fetch(debug+'/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let next=0;const pending=new Map();const errors=[];let loginCount=0,meCount=0,mfaAttempts=0;const unknown=[];let keyCreated=false;
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const reply=async(requestId,status,body)=>call('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:status===204?[]:[{name:'Content-Type',value:'application/json'}],...(status===204?{}:{body:Buffer.from(JSON.stringify(body)).toString('base64')})});
const user=id=>({users_id:id,display_name:id==='user-A'?'First test account':'Second test account',email:id==='user-A'?'first@example.test':'second@example.test',email_verified:true,roles:['user'],permissions:['investigations.create','investigations.read_own','reports.submit']});
const session=id=>({user:user(id),access_token:'fixture-'+id,token_type:'Bearer',expires_in:900});
const dates={created_at:'2026-10-22T10:00:00Z',updated_at:'2026-10-22T10:00:00Z',started_at:null,completed_at:null};
const key={api_key_id:'key-id',name:'Client test key',key_prefix:'pc_key_fixture',scopes:['investigations:read'],created_at:dates.created_at,expires_at:'2026-11-21T10:00:00Z',revoked_at:null,last_used_at:null};
async function handle(event){const path=new URL(event.request.url).pathname;const body=event.request.postData?JSON.parse(event.request.postData):{};const auth=event.request.headers.Authorization||event.request.headers.authorization;const id=auth==='Bearer fixture-user-B'?'user-B':'user-A';
 if(path==='/v1/auth/login'){loginCount++;return reply(event.requestId,200,loginCount===1?{mfa_required:true,challenge_token:'fixture-challenge',expires_in:300}:session('user-B'));}
 if(path==='/v1/auth/mfa/verify'){if(auth)throw new Error('Public factor exchange sent bearer auth');mfaAttempts++;return body.code==='012345'?reply(event.requestId,200,session('user-A')):reply(event.requestId,401,{error:{code:'invalid_mfa_code',message:'Invalid second factor'}});}
 if(path==='/v1/auth/me'){meCount++;return reply(event.requestId,200,{user:user(id)});}
 if(path==='/v1/me/account')return reply(event.requestId,200,{providers:['password']});
 if(path==='/v1/me/businesses')return reply(event.requestId,200,{businesses:[]});
 if(path==='/v1/directory')return reply(event.requestId,200,{businesses:[]});
 if(path==='/v1/reports')return reply(event.requestId,200,{reports:[]});
 if(path==='/v1/disputes')return reply(event.requestId,200,{disputes:[]});
 if(path==='/v1/me/business-invitations')return reply(event.requestId,200,{invitations:[]});
 if(path==='/v1/billing/me')return reply(event.requestId,200,{enabled:false,available_units:0,subscriptions:[]});
 if(path==='/v1/me/notification-preferences')return reply(event.requestId,200,{preferences:[{notification_type:'investigation.completed',enabled:true},{notification_type:'investigation.failed',enabled:true},{notification_type:'business.invitation',enabled:true}]});
 if(path==='/v1/me/notifications')return reply(event.requestId,200,{notifications:[]});
 if(/^\/v1\/investigations\/investigation-user-[AB]$/.test(path))return reply(event.requestId,200,{investigation:{investigation_id:'investigation-'+id,user_id:id,investigation_type:'general_research',title:'Completed evidence check',status:'completed',result_summary:'Server-provided summary',...dates},targets:[],limitations:[],capabilities:{independent_search:false,ai_analysis:true},source_collection_complete:true});
 if(path.endsWith('/findings')){const offset=Number(new URL(event.request.url).searchParams.get('offset')||0);return reply(event.requestId,200,{findings:Array.from({length:offset===0?50:1},(_,index)=>({finding_id:'finding-'+(offset+index),verification_status:'unverified',title:'Evidence row '+(offset+index),explanation:'Server evidence explanation',sources:[]}))});}
 if(path.endsWith('/sources'))return reply(event.requestId,200,{sources:[]});
 if(path==='/v1/investigations')return reply(event.requestId,200,{investigations:[{investigation_id:'investigation-'+id,user_id:id,investigation_type:'general_research',title:id==='user-A'?'Account A private check':'Account B private check',status:'queued',error_code:null,...dates}],next_cursor:null});
 if(path==='/v1/me/bookmarks')return reply(event.requestId,200,{bookmarks:[{investigation_id:'investigation-'+id,investigation_type:'general_research',title:id==='user-A'?'Account A saved research':'Account B saved research',status:'queued',bookmarked_at:dates.created_at}]});
 if(path==='/v1/auth/mfa')return reply(event.requestId,200,{enabled:false,recovery_codes_remaining:0});
 if(path==='/v1/auth/sessions')return reply(event.requestId,200,{sessions:[{session_id:'session-'+id,authenticated_at:dates.created_at,expires_at:'2026-10-22T10:15:00Z',is_current:true}]});
 if(path==='/v1/auth/mfa/setup')return reply(event.requestId,200,{secret:'FIXTURE-ONLY-NOT-A-REAL-SECRET',otpauth_uri:'otpauth://totp/PadiCheck:test?secret=JBSWY3DPEHPK3PXP&issuer=PadiCheck',expires_in:600});
 if(path==='/v1/auth/mfa/confirm')return reply(event.requestId,200,{enabled:true,recovery_codes:['abcdef012345abcdef012345','012345abcdef012345abcdef'],sign_in_required:true});
 if(path==='/v1/me/api-keys'&&event.request.method==='POST'){keyCreated=true;return reply(event.requestId,201,{api_key:key,secret:'pc_key_one_time_fixture_only'});}
 if(path==='/v1/me/api-keys')return reply(event.requestId,200,{api_keys:keyCreated?[key]:[]});
 if(path==='/v1/auth/logout-all'||path==='/v1/auth/logout')return reply(event.requestId,204);
 if(path==='/v1/billing/offers')return reply(event.requestId,200,{enabled:false,offers:[]});
 unknown.push(path);return reply(event.requestId,503,{error:{code:'test_unhandled',message:'No fixture for this request'}});
}
ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const job=pending.get(message.id);pending.delete(message.id);message.error?job?.reject(new Error(message.error.message)):job?.resolve(message.result);}else if(message.method==='Fetch.requestPaused'){void handle(message.params).catch(error=>{errors.push(error.message);void reply(message.params.requestId,500,{error:{code:'test_failure',message:'Fixture failed'}});});}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);else if(message.method==='Page.javascriptDialogOpening')void call('Page.handleJavaScriptDialog',{accept:true});};
const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(text){for(let i=0;i<80;i++){await sleep(150);if(await evaluate('document.body.innerText.includes('+JSON.stringify(text)+')').catch(()=>false))return;}throw new Error('Expected browser state missing: '+text);}
const input=async(selector,value)=>evaluate(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});if(!field)throw new Error('Input unavailable');const proto=field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(field,${JSON.stringify(value)});field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const click=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
const clickText=text=>evaluate(`(()=>{const button=[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(text)});if(!button)throw new Error('Control unavailable');button.click();})()`);
async function route(path){await evaluate(`(()=>{history.pushState({idx:(history.state?.idx||0)+1},'',${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'));})()`);}
function check(name,pass){console.log(JSON.stringify({mode:'mocked-browser',check:name,pass}));if(!pass)throw new Error('Browser regression: '+name);}
try{
 await call('Runtime.enable');await call('Page.enable');await call('Fetch.enable',{patterns:[{urlPattern:origin+'/v1/*'}]});
 await call('Page.navigate',{url:origin+'/signin'});await wait('Sign in');
 await input('input[type=email]','first@example.test');await input('input[type=password]','ClientOnlyPassword123!');await click('form button[type=submit], form button:not([type])');await wait('Two-factor sign-in');
 check('first factor stops at MFA without /me',meCount===0&&await evaluate("location.pathname==='/mfa'"));
 await input('input[autocomplete="one-time-code"]','000000');await click('form button');await wait('second-factor code is invalid');check('wrong factor stays pending',meCount===0);
 await input('input[autocomplete="one-time-code"]','012345');await click('form button');await wait('Account A private check');check('verified factor establishes session through /me',meCount===1&&mfaAttempts===2);
 await route('/admin?role=superAdmin');await wait('This account has no staff role');check('client role parameters cannot elevate a user',await evaluate("location.pathname==='/admin/login' && !document.querySelector('nav[aria-label=Admin]')"));
 await route('/saved');await wait('Account A saved research');check('bookmarks are loaded for account A',true);
 await route('/account/security');await wait('Two-factor authentication');await click('button[role=switch][aria-label="Two-factor authentication"]');await wait('Set up two-factor authentication');
 await input('input[aria-label="Digit 1"]','123456');await clickText('Verify code');await wait('Save these recovery codes privately');
 check('one-time recovery screen survives forced sign-out',await evaluate("location.pathname==='/security-complete' && document.body.innerText.includes('abcdef012345abcdef012345')"));
 check('tokens and recovery codes are absent from browser storage',await evaluate("!JSON.stringify({...localStorage,...sessionStorage}).includes('abcdef012345abcdef012345')&&!JSON.stringify({...localStorage,...sessionStorage}).includes('fixture-user-A')"));
 await click('a[href="/signin"]');await wait('Sign in');await input('input[type=email]','second@example.test');await input('input[type=password]','ClientOnlyPassword123!');await click('form button');await wait('Account B private check');
 await route('/saved');await wait('Account B saved research');check('account switch removes previous account data',await evaluate("!document.body.innerText.includes('Account A saved research')&&!document.body.innerText.includes('abcdef012345abcdef012345')"));
 await route('/result/investigation-user-B');await wait('Evidence row 49');check('original result layout renders server evidence',await evaluate("document.body.innerText.includes('Server-provided summary')"));await clickText('More findings');await wait('Evidence row 50');check('evidence pagination preserves earlier rows without duplicates',await evaluate("document.body.innerText.includes('Evidence row 0')&&[...document.querySelectorAll('li')].filter(node=>node.textContent.includes('Evidence row 0')).length===1"));
 for(const path of ['/account','/history','/check/shopping','/business','/business/profile','/business/team','/business/verification','/business/reports','/developers','/developers/docs','/developers/webhooks','/my-reports']){await route(path);await sleep(1200);check('restored route renders '+path,await evaluate("document.querySelector('main')!==null && document.body.innerText.length>80"));}
 await route('/developers/keys');await wait('New key');await clickText('New key');await wait('Create an API key');await input('[role=dialog] input','Client test key');await clickText('Create key');await wait('Copy your key now');
 check('key secret is shown once without storage',await evaluate("document.body.innerText.includes('pc_key_one_time_fixture_only')&&!JSON.stringify({...localStorage,...sessionStorage}).includes('pc_key_one_time_fixture_only')"));
 await route('/saved');await wait('Account B saved research');await route('/developers/keys');await wait('Client test key');check('returning to key list does not recover the secret',await evaluate("!document.body.innerText.includes('pc_key_one_time_fixture_only')"));
 await route('/account');await wait('Log out of all devices');await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Log out of all devices')).click()");await wait('Log out all');await clickText('Log out all');await wait('Sign in');check('logout-all clears the protected session',await evaluate("location.pathname==='/signin'"));
 check('no unexpected API requests or runtime exceptions',unknown.length===0&&errors.length===0);
}catch(error){console.error(error.message);console.error(JSON.stringify({errors,unknown}));process.exitCode=1;}finally{await call('Page.close').catch(()=>{});ws.close();}
