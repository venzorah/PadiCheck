import fs from 'node:fs';
import { connectPage } from './cdp.mjs';
const results=[];
for(const viewport of [{width:1440,height:1000,mobile:false},{width:390,height:844,mobile:false}]) for(const route of ['/welcome','/signin','/signup','/how-it-works']){
 const measurements=[];
 for(const port of [5188,5187]){
  const page=await connectPage();
  try{
   await page.call('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1});
   await page.call('Page.navigate',{url:`http://127.0.0.1:${port}${route}`});
   await page.waitFor("document.querySelector('h1')!==null && document.querySelector('h1').getBoundingClientRect().height>0");
   await new Promise(resolve=>setTimeout(resolve,700));
   await page.waitFor("document.querySelector('h1')!==null");
   measurements.push(await page.evaluate(`(()=>{const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n));};const heading=document.querySelector('h1');return {heading:rect(heading),aside:rect(document.querySelector('aside')),form:rect(document.querySelector('form')),font:getComputedStyle(heading).fontFamily,color:getComputedStyle(heading).color};})()`));
   const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.mkdirSync('.tmp/ui-parity',{recursive:true});fs.writeFileSync(`.tmp/ui-parity/${viewport.width}-${route.slice(1)}-${port===5188?'reference':'restored'}.png`,Buffer.from(shot.data,'base64'));
  }finally{await page.call('Page.close');page.disconnect();}
 }
 const [reference,restored]=measurements;const match=JSON.stringify(reference)===JSON.stringify(restored);
 results.push({viewport:viewport.width,route,reference,restored,layoutMatch:match,expectedResponsiveDifference:route==='/welcome'&&viewport.width<640});console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync('.tmp/ui-parity/layout-results.json',JSON.stringify(results,null,2));
process.exitCode=results.every(row=>row.layoutMatch||row.expectedResponsiveDifference)?0:1;
