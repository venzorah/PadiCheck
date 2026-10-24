import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const encode=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const clientUrl=encode((await readFile(new URL('../src/api/client.ts',import.meta.url),'utf8')).replace('import.meta.env.VITE_API_BASE_URL',"'https://api.example.test'"));
const client=await import(clientUrl);
const {creditsApi}=await import(encode((await readFile(new URL('../src/api/credits.ts',import.meta.url),'utf8')).replace("'./client'",JSON.stringify(clientUrl))));
const {buildInvestigation,creditCostType}=await import(encode(await readFile(new URL('../src/utils/investigations.ts',import.meta.url),'utf8')));
const {investigationsApi}=await import(encode((await readFile(new URL('../src/api/investigations.ts',import.meta.url),'utf8')).replace("'./client'",JSON.stringify(clientUrl))));
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;client.setAccessToken(null);});

test('every check context maps to the same price category for text and link submissions',()=>{
 for(const context of ['business','phone','property','job','shopping','freelance','person','social','listing','website','link','any'])for(const mode of ['text','link']){
 const request=buildInvestigation({type:context,mode,text:context==='phone'?'+14155552671':'Public example',url:'https://example.com',mediaIds:[]});
 const pricedContext=request.input_data.check_context;
 const backendKey=['property','shopping','freelance','person','social','listing'].includes(pricedContext)?pricedContext:request.investigation_type;
 assert.equal(creditCostType(context,mode),backendKey,context+' '+mode);
 }
 assert.equal(creditCostType('contract','upload'),'contract_review');
});
test('admin saves only validated policy fields with its revision and authenticated API request',async()=>{
 client.setAccessToken('fixture-token');let captured;
 globalThis.fetch=async(url,options)=>{captured={url,options};return Response.json({enabled:true,policy:{revision:8}});};
 await creditsApi.save({environment:'sandbox',welcome_credits:10,costs:{phone_lookup:2},revision:7,updated_at:'ignored'});
 assert.equal(captured.url,'https://api.example.test/v1/admin/credits/policy');assert.equal(captured.options.method,'PUT');
 assert.equal(captured.options.headers.get('Authorization'),'Bearer fixture-token');
 assert.deepEqual(JSON.parse(captured.options.body),{welcome_credits:10,costs:{phone_lookup:2},revision:7});
});
test('confirmed cost is sent as a price guard, never as a client balance deduction',async()=>{
 client.setAccessToken('fixture-token');let payload;
 globalThis.fetch=async(url,options)=>{payload=JSON.parse(options.body);return Response.json({investigation:{investigation_id:'fixture'},dispatch:'queued'});};
 const request=buildInvestigation({type:'property',mode:'text',text:'Public property address',url:'',mediaIds:[]});
 request.expected_credit_cost=6;await investigationsApi.create(request);
 assert.equal(payload.expected_credit_cost,6);assert.equal(payload.input_data.check_context,'property');assert.equal(payload.balance,undefined);
});
