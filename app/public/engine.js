export const slotIds=['self','p1','p2','p3','p4','p5','p6','p7'];
const unique=x=>[...new Set(x||[])];
export function validateObservation(o,catalog,now=Date.now()){
  if(!o||!slotIds.includes(o.slot))throw Error('请选择自己或对手编号');
  if(!/^\d-[1-9]$/.test(o.round||''))throw Error('回合格式例如 2-5');
  if(o.phase!=='planning')throw Error('战斗或未知画面不能覆盖备战记录，请等待备战画面');
  if(o.confirmed!==true)throw Error('请先确认身份和识别结果');
  const t=Date.parse(o.observedAt);if(!Number.isFinite(t)||t>now+5000||now-t>6*3600000)throw Error('观察时间无效或过旧');
  for(const [field,list] of [['items',catalog.items],['augments',catalog.augments],['heroes',catalog.heroes]]){
    if(!Array.isArray(o[field])||o[field].length>64)throw Error('观察字段格式有误');
    const known=new Set(list.map(x=>x.id));if(o[field].some(id=>!known.has(id)))throw Error('存在未确认或不属于当前资料库的识别项');
  }
  if(o.season!==catalog.season)throw Error('赛季不匹配');
  return {...o,items:[...o.items].sort(),augments:unique(o.augments).sort(),heroes:unique(o.heroes).sort()};
}
export function recordObservation(records,input,catalog,now=Date.now()){
  const o=validateObservation(input,catalog,now),prev=records[o.slot];
  if(prev&&(Date.parse(o.observedAt)<=Date.parse(prev.observedAt)||roundNumber(o.round)<roundNumber(prev.round)))return {records,status:'outdated'};
  const signature=x=>JSON.stringify([x.items,x.augments,x.heroes,x.phase]);
  const unchanged=prev&&signature(prev)===signature(o);
  return {records:{...records,[o.slot]:{...o,changedAt:unchanged?prev.changedAt||prev.observedAt:o.observedAt}},status:unchanged?'unchanged':'updated'};
}
export function roundNumber(round){const [a,b]=round.split('-').map(Number);return a*10+b;}
export function stale(o,round,now=Date.now()){return !o||o.round!==round||now-Date.parse(o.observedAt)>90000;}
export function inferDirections(o,catalog){
  if(!o)return [];
  const early=Number(o.round.split('-')[0])<4;
  const completed=new Set(catalog.items.filter(i=>i.type!=='part').map(i=>i.id));
  return catalog.comps.map(c=>{
    const recommended=new Set(c.units.flatMap(h=>h.items));
    const matchedItems=unique(o.items).filter(i=>completed.has(i)&&recommended.has(i));
    const matchedAugments=c.requiredAugments.filter(a=>o.augments.includes(a));
    const matchedHeroes=c.units.filter(u=>o.heroes.includes(u.hero)&&(!early||u.cost<=3)).map(u=>u.hero);
    const confirmedCore=!early&&c.coreHero&&o.heroes.includes(c.coreHero);
    // Weights are transparent engineering defaults, not calibrated probabilities.
    const score=matchedItems.length*3+matchedAugments.length*7+Math.min(matchedHeroes.length,3)*.5+(confirmedCore?5:0);
    return {compId:c.id,score,matchedItems,matchedAugments,matchedHeroes,confirmedCore:Boolean(confirmedCore),needsAugment:c.requiredAugments.filter(a=>!o.augments.includes(a))};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.compId.localeCompare(b.compId));
}
export function analyze(records,catalog,{round='2-5',goal='steady',now=Date.now()}={}){
  const self=records.self;
  const opponents=slotIds.slice(1).map(slot=>{
    const observation=records[slot],candidates=inferDirections(observation,catalog),top=candidates[0]?.score||0;
    // Near ties stay ambiguous. Never turn a distribution into a count of confirmed competitors.
    return {slot,observation,stale:stale(observation,round,now),candidates:candidates.filter(c=>c.score>=Math.max(3,top-2)).slice(0,5)};
  });
  if(!self)return {status:'need_self',recommendations:[],opponents,message:'先记录自己的装备、强化和过渡牌，再比较方向。'};
  if(stale(self,round,now))return {status:'need_self_update',recommendations:[],opponents,message:'自己的记录已过期，请重新确认当前局势。'};
  const mine=inferDirections(self,catalog).filter(c=>c.score>=3);
  const recommendations=mine.map(m=>{
    const c=catalog.comps.find(x=>x.id===m.compId);
    const potential=opponents.filter(p=>!p.stale&&p.candidates.some(x=>x.compId===c.id));
    const old=opponents.filter(p=>p.stale&&p.candidates.some(x=>x.compId===c.id));
    // Conservative tie-break only; historical outcomes are not the current player's chances.
    const historical=goal==='first'?c.stats.winPct/100:(8-c.stats.averagePlace)/8;
    const eligible=m.needsAugment.length===0;
    return {...m,comp:c,potential:potential.map(p=>p.slot),oldPotential:old.map(p=>p.slot),eligible,
      sortScore:m.score+historical-potential.length*.6-(eligible?0:100)};
  }).sort((a,b)=>b.sortScore-a.sortScore).slice(0,4);
  const warnings=[...catalog.caveats];
  if(!catalog.patch)warnings.push('具体补丁未确认，本次为研究建议，尚不能作为正式版本定阵结论');
  if(now-Date.parse(catalog.fetchedAt)>24*3600000)warnings.push('排行快照已超过24小时，需要刷新');
  if(opponents.some(p=>!p.observation))warnings.push('尚未观察全场，潜在竞争可能遗漏');
  return {status:recommendations.length?'research':'insufficient',recommendations,opponents,warnings,
    message:recommendations.length?'根据已确认信息比较方向；潜在同行尚未锁定阵容。':'目前证据不足。请补充已合成装备或具有阵容指向的强化。'};
}
