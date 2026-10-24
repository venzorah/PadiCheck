import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/utils/billingHistory.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {billingAmount}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('billing records format stored currency and decimal amounts without inventing tax',()=>{
 assert.match(billingAmount('100.000000','NGN'),/₦\s*100\.00/);
 assert.match(billingAmount('10.250000','USD'),/\$\s*10\.25/);
 assert.equal(billingAmount('secret','NGN'),'Amount unavailable');
 assert.equal(billingAmount('Infinity','USD'),'Amount unavailable');
 assert.equal(billingAmount('10','invalid'),'Amount unavailable');
});
