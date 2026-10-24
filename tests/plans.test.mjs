import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const encode=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const clientUrl=encode((await readFile(new URL('../src/api/client.ts',import.meta.url),'utf8')).replace('import.meta.env.VITE_API_BASE_URL',"''"));const client=await import(clientUrl);
const {plansApi}=await import(encode((await readFile(new URL('../src/api/plans.ts',import.meta.url),'utf8')).replace("'./client'",JSON.stringify(clientUrl))));
const {adminReturnPath}=await import(encode(await readFile(new URL('../src/utils/adminReturnPath.ts',import.meta.url),'utf8')));
const {generatePlanKey}=await import(encode(await readFile(new URL('../src/utils/planKey.ts',import.meta.url),'utf8')));
const originalPlansUrl=encode(await readFile(new URL('../src/data/plans.ts',import.meta.url),'utf8'));
const {planDraft}=await import(encode((await readFile(new URL('../src/utils/planDraft.ts',import.meta.url),'utf8')).replace("'../data/plans'",JSON.stringify(originalPlansUrl))));
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;client.setAccessToken(null);});
test('naira plan creation, revision updates and explicit manual-checkout activation use authenticated endpoints',async()=>{
 client.setAccessToken('fixture');const requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,options});return Response.json({plan:{plan_id:'fixture'},enabled:true});};
 const value={plan_key:'plus',audience:'consumer',display_name:'Plus',tagline:'For regular buyers and renters',currency:'NGN',monthly_amount:'2500.00',yearly_amount:'25000.00',monthly_credits:30,yearly_credits:360,features:['Full reports with evidence'],is_popular:true,is_published:true};
 await plansApi.create(value);await plansApi.save({plan_id:'fixture',revision:3},value);await plansApi.enable('fixture');
 assert.deepEqual(requests.map(r=>r.options.method),['POST','PUT','POST']);
 assert.equal(requests[0].url,'/v1/admin/billing/plans');assert.equal(JSON.parse(requests[0].options.body).currency,'NGN');assert.equal(JSON.parse(requests[1].options.body).revision,3);
 assert.deepEqual(JSON.parse(requests[2].options.body),{acknowledge_manual_renewal:true});for(const r of requests)assert.equal(r.options.headers.get('Authorization'),'Bearer fixture');
});
test('admin plan-creation links survive login without accepting outside redirects',()=>{
 assert.equal(adminReturnPath('/admin/plans/new'),'/admin/plans/new');
 for(const value of ['https://outside.test','//outside.test','/account','/administrator','/admin\\outside.test',null])assert.equal(adminReturnPath(value),'/admin');
});
test('the optional Plus template is an unsaved naira draft with the original price and admin-controlled highlight',()=>{
 const draft=planDraft('plus');assert.equal(draft.currency,'NGN');assert.equal(draft.monthly_amount,'2500.00');assert.equal(draft.monthly_credits,30);assert.equal(draft.is_popular,true);assert.equal(draft.is_published,false);assert.equal(planDraft('unknown'),null);
});
test('automatic plan keys match API rules and avoid existing keys within the catalog',()=>{
 assert.equal(generatePlanKey('Plus Premium'),'plus-premium');
 assert.equal(generatePlanKey('  Café & Renters!  '),'cafe-renters');
 assert.equal(generatePlanKey('Plus',['plus','plus-2']),'plus-3');
 assert.equal(generatePlanKey('   '),'');
 const longName='Long plan '.repeat(20);const first=generatePlanKey(longName);const second=generatePlanKey(longName,[first]);
 assert.ok(second.length<=50);assert.notEqual(first,second);assert.match(second,/^[a-z0-9_-]{1,50}$/);
});
