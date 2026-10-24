export function generatePlanKey(name:string,existingKeys:readonly string[]=[]):string{
 if(!name.trim())return '';
 const base=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50).replace(/-+$/,'')||'plan';
 const used=new Set(existingKeys);
 if(!used.has(base))return base;
 for(let index=2;;index++){
  const suffix='-'+index;
  const key=base.slice(0,50-suffix.length).replace(/-+$/,'')+suffix;
  if(!used.has(key))return key;
 }
}
