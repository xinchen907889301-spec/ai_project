import {slotIds,recordObservation,analyze,stale} from './engine.js';
const $=id=>document.getElementById(id), name=id=>id==='self'?'自己':`对手 ${id.slice(1)}`;
let catalog,records={},selected='self',draft={items:[],augments:[],heroes:[]},image=null,captureTime=null,generation=0,isDemo=false;
const storageKey='yiyou-session-v1';
function text(tag,value,cls){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({records,isDemo,round:$('round').value}));}catch{}}
function edited(){generation++;$('confirmed').checked=false;if(image)$('recognize').disabled=false;}
function labels(field,ids){const list=catalog[field];return ids.map(id=>list.find(x=>x.id===id)?.name||'未匹配').join('、');}
function render(){
  const round=$('round').value,expert=$('expert').checked;
  $('demo-label').classList.toggle('hidden',!isDemo);
  $('slots').replaceChildren();let seen=0;
  for(const id of slotIds){
    const o=records[id],b=text('button',name(id),'slot'+(selected===id?' selected':''));
    const old=stale(o,round);if(o&&id!=='self')seen++;
    b.append(text('small',o?`${o.round} · ${old?'需更新':'本回合已记录'}`:'尚未观察',old?'':'fresh'));
    b.onclick=()=>loadSlot(id);$('slots').append(b);
  }
  $('coverage').textContent=`${seen} / 7 家`;
  const result=analyze(records,catalog,{round,goal:$('goal').value});
  const viewed=result.opponents.find(p=>p.slot===selected);
  $('opponent-direction').classList.toggle('hidden',!viewed);
  if(viewed){const names=viewed.candidates.map(p=>catalog.comps.find(c=>c.id===p.compId)?.name).filter(Boolean);$('opponent-direction').textContent=names.length?`${viewed.stale?'旧记录，仅供参考。':'当前证据支持的潜在方向：'}${names.join(' / ')}。这些候选不代表对方已经定阵。`:'已知证据不足，尚不能预判这名玩家的方向。';}
  $('advice-message').textContent=result.message;$('advice').replaceChildren();
  for(const [i,r] of result.recommendations.entries()){
    const card=text('div','','card'),c=r.comp;
    card.append(text('h3',`${i===0?'优先比较':'备选方向'} · ${c.name}`));
    const evidence=[];if(r.matchedItems.length)evidence.push('装备：'+labels('items',r.matchedItems));if(r.matchedAugments.length)evidence.push('强化：'+labels('augments',r.matchedAugments));
    card.append(text('p',evidence.join('；')||'目前主要依据已持有英雄','evidence'));
    card.append(text('p',r.potential.length?`潜在竞争：${r.potential.map(name).join('、')}。同一玩家也可能转向其他候选。`:'已记录的新鲜信息中，暂未发现明确同方向证据。','risk'));
    if(r.oldPotential.length)card.append(text('p',`${r.oldPotential.map(name).join('、')}的旧记录曾指向该阵容，建议补看。`,'risk'));
    if(!r.eligible)card.append(text('p','条件未满足：需要确认 '+labels('augments',r.needsAugment)+'，暂不作为可执行定阵。','risk'));
    if(c.unresolvedConditions.length)card.append(text('p','此阵容还有待核对的体系条件，不能仅凭装备直接定阵。','risk'));
    if(expert){
      const stats=text('div','','stats');
      for(const [n,v] of [['平均名次',c.stats.averagePlace.toFixed(2)],['历史前四率',c.stats.top4Pct+'%'],['历史登顶率',c.stats.winPct+'%']]){const b=text('div','');b.append(text('strong',v),text('small',n));stats.append(b);}card.append(stats);
      card.append(text('p',`网站评级 ${c.tier} · ${c.tags.join(' / ')}。历史统计不是本局获胜概率。`,'evidence'));
      if(r.matchedHeroes.length)card.append(text('p','过渡牌辅助证据：'+labels('heroes',r.matchedHeroes),'evidence'));
    }
    const a=text('a','查看原始阵容资料 ↗');a.href=c.sourceUrl;a.target='_blank';a.rel='noopener';card.append(a);$('advice').append(card);
  }
  $('warnings').replaceChildren(...(result.warnings||catalog.caveats).map(w=>text('li',w)));
}
function loadSlot(id){
  generation++;selected=id;const o=records[id];draft={items:[...(o?.items||[])],augments:[...(o?.augments||[])],heroes:[...(o?.heroes||[])]};
  $('identity').value=id;$('editor-title').textContent='记录'+name(id);$('observed-round').value=$('round').value;$('phase').value='planning';$('confirmed').checked=false;
  captureTime=null;image=null;$('preview').classList.add('hidden');$('recognize').disabled=true;$('message').textContent='';$('record-status').textContent='等待确认';
  for(const f of ['item','augment','hero']){$(f+'-search').value='';$(f+'-options').replaceChildren();}renderChips();render();
}
function renderChips(){
  for(const field of ['items','augments','heroes']){
    $(field).replaceChildren();for(const [i,id] of draft[field].entries()){
      const b=text('button',labels(field,[id])+' ×');b.onclick=()=>{draft[field].splice(i,1);edited();renderChips();};$(field).append(b);
    }
  }
}
function search(prefix,field){
  $(prefix+'-search').oninput=()=>{
    const q=$(prefix+'-search').value.trim().toLowerCase();const out=$(prefix+'-options');out.replaceChildren();if(!q)return;
    for(const entry of catalog[field].filter(x=>x.name.toLowerCase().includes(q)&&!draft[field].includes(x.id)&&(field!=='items'||x.type!=='part')).slice(0,15)){
      const b=text('button',entry.name);b.onclick=()=>{draft[field].push(entry.id);edited();renderChips();$(prefix+'-search').value='';out.replaceChildren();};out.append(b);
    }
  };
}
async function acceptImage(data,capturedAt){
  generation++;image=data;captureTime=capturedAt||new Date().toISOString();$('preview').src=data;$('preview').classList.remove('hidden');$('recognize').disabled=false;$('confirmed').checked=false;
  draft={items:[],augments:[],heroes:[]};renderChips();$('phase').value='unknown';$('record-status').textContent='画面已采集 · 尚未识别';
  $('image-note').textContent='请确认这是谁的画面及实际回合。导入图片的真实拍摄时间无法自动核验；不要把旧图当成本回合。';
}
window.acceptNativeCapture=(data,capturedAt)=>acceptImage(data,capturedAt);
function baseUrl(){const raw=$('server-url').value.trim();if(!raw&&location.hostname==='appassets.androidplatform.net')throw Error('请先填写视觉分析服务地址');return raw.replace(/\/$/,'');}
async function call(path,body){
  const base=baseUrl();if(base&&!/^https:\/\//.test(base)&&!/^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2)(:\d+)?$/.test(base))throw Error('请使用 HTTPS 服务地址');
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...($('access-token').value?{Authorization:'Bearer '+$('access-token').value}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'服务请求失败');return data;
}
async function boot(){
  catalog=await (await fetch('catalog.json')).json();
  $('source').replaceChildren(text('strong',`金铲铲 S${catalog.season} · 宗师资料快照 · ${catalog.comps.length} 套阵容`),text('div',`获取于 ${new Date(catalog.fetchedAt).toLocaleString('zh-CN')}。具体补丁与统计时间窗待核验；当前用于研究和校准，不承诺实战效果。`));
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved){records=saved.records||{};isDemo=Boolean(saved.isDemo);$('round').value=saved.round||'2-5';}}catch{}
  for(const id of slotIds)$('identity').add(new Option(name(id),id));
  for(const id of ['identity','observed-round','phase'])$(id).onchange=edited;
  search('item','items');search('augment','augments');search('hero','heroes');
  $('save').onclick=()=>{
    try{
      const result=recordObservation(records,{...draft,slot:$('identity').value,round:$('observed-round').value,phase:$('phase').value,confirmed:$('confirmed').checked,season:catalog.season,observedAt:captureTime||new Date().toISOString(),source:image?'screenshot_confirmed':'manual'},catalog);
      records=result.records;selected=$('identity').value;persist();render();
      $('record-status').textContent=result.status==='outdated'?'旧记录未覆盖':'已确认记录';
      $('message').textContent={outdated:'新记录比已存记录更旧，未覆盖。',unchanged:'本次未发现内容变化，已更新观察时间。',updated:'已记录，可继续侦察下一家。'}[result.status];
      if(result.status!=='outdated'&&navigator.vibrate)navigator.vibrate(45);
    }catch(e){$('message').textContent=e.message;}
  };
  $('round').onchange=()=>{persist();render();};$('goal').onchange=render;$('expert').onchange=render;
  $('reset').onclick=()=>{if(!confirm('清空本局记录并开始新对局？'))return;records={};isDemo=false;persist();loadSlot('self');};
  $('demo').onclick=()=>{
    if(Object.keys(records).length&&!confirm('演示会替换当前本局记录，继续吗？'))return;
    records={};isDemo=true;$('round').value='2-5';
    const targets=[catalog.comps.find(c=>c.requiredAugments.length===0&&c.units.some(u=>u.items.length>=2))||catalog.comps[0],catalog.comps.at(-1)];
    for(const [slot,c] of [['self',targets[0]],['p1',targets[0]],['p2',targets[1]]]){
      const unit=c.units.find(u=>u.items.length>=2)||c.units.find(u=>u.items.length);
      records=recordObservation(records,{slot,round:'2-5',phase:'planning',confirmed:true,season:catalog.season,items:unit?.items.slice(0,2)||[],augments:c.requiredAugments,heroes:c.units.filter(u=>u.cost<=3).slice(0,2).map(u=>u.hero),observedAt:new Date().toISOString(),source:'demo'},catalog).records;
    }
    persist();loadSlot('self');
  };
  $('image').onchange=async()=>{
    const file=$('image').files[0];if(!file)return;if(file.size>8*1024*1024){$('message').textContent='请使用8MB以内的截图';return;}
    const reader=new FileReader();reader.onload=()=>acceptImage(reader.result);reader.readAsDataURL(file);
  };
  $('recognize').onclick=async()=>{
    const g=generation;$('recognize').disabled=true;$('record-status').textContent='正在识别';
    try{
      const result=await call('/api/vision',{image});if(g!==generation)return;
      const d=result.draft;draft={items:d.items,augments:d.augments,heroes:d.heroes};renderChips();
      $('phase').value=d.phase;if(d.round)$('observed-round').value=d.round;
      $('record-status').textContent='识别完成 · 请确认';$('message').textContent=`画面名称：${d.playerName||'未识别'}。${d.uncertain.join('；')} 请核对玩家编号。`;$('confirmed').checked=false;
    }catch(e){if(g===generation){$('record-status').textContent='未完成识别';$('message').textContent=e.message;}}
    finally{if(g===generation)$('recognize').disabled=false;}
  };
  $('check-service').onclick=async()=>{try{const r=await call('/api/health');$('service-status').textContent=r.visionConfigured?'服务可连接，视觉模型已配置，仍需实测截图。':'服务可连接，视觉模型尚未配置。';}catch(e){$('service-status').textContent=e.message;}};
  if(window.NativeBridge){$('native-capture').classList.remove('hidden');$('native-capture').onclick=()=>window.NativeBridge.startCapture();}
  loadSlot('self');setInterval(render,15000);
  if(window.NativeBridge)window.NativeBridge.pageReady();
}
boot().catch(e=>{$('source').textContent='资料加载失败，请重新打开应用。'+e.message;});
