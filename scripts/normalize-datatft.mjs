export function normalize(payload, database, metadata) {
  if (!payload.success || payload.code !== 1 || !Array.isArray(payload.data?.list)) throw Error('排行响应格式或状态无效');
  if (metadata.platform !== 'jcc') throw Error('必须是金铲铲数据');
  const season=String(metadata.filters.season), heroes=database['heros'+season], items=database['equips'+season], augments=database['hexs'+season]?.flat();
  if (!heroes?.length || !items?.length || !augments?.length) throw Error('资料库与赛季不匹配');
  const heroById=new Map(heroes.map(h=>[String(h.chessId),h])), augmentIds=new Set(augments.map(a=>a.hexId));
  const comps=payload.data.list.map((r,index)=>{
    for (const k of ['place','top4','won','playRate']) if (!Number.isFinite(r[k])) throw Error(`缺少指标 ${k}`);
    if(r.place<1||r.place>8||r.top4<0||r.top4>100||r.won<0||r.won>r.top4||r.playRate<0)throw Error('指标超出范围');
    return {id:String(r.id),name:r.title,tier:r.tier,siteOrder:index+1,siteScore:r.score,
      difficulty:r.difficulty,tags:r.tags||[],coreHero:heroById.get(String(r.heroId))?.key||null,
      requiredAugments:(r.titleApi||[]).filter(x=>augmentIds.has(x)),unresolvedConditions:(r.titleApi||[]).filter(x=>!augmentIds.has(x)&&!heroes.some(h=>h.key===x)),
      units:(r.heros||[]).map(h=>({hero:h.key,cost:heroById.get(String(h.id))?.price??null,stars:h.stars||null,items:h.tftEquips||[]})),
      stats:{averagePlace:r.place,top4Pct:r.top4,winPct:r.won,pickRateRaw:r.playRate,sampleSize:null},sourceUrl:`https://jcc.datatft.com/h5/lineup/${r.id}?season=${season}`};
  });
  if(new Set(comps.map(c=>c.id)).size!==comps.length)throw Error('阵容ID重复');
  return {schemaVersion:1,platform:'jcc',season,patch:null,reviewStatus:'research_snapshot',fetchedAt:metadata.fetchedAt,
    sourceUrl:metadata.sourceUrl,filters:metadata.filters,totalCountRaw:payload.data.count,
    caveats:['尚未确认具体补丁、统计时间窗与每套阵容样本量','登场率单位未核验，不作为概率使用','网站评级与统计指标分别保存','早期预判为可解释启发式，分数不是概率'],
    heroes:heroes.map(h=>({id:h.key,name:h.displayName,cost:h.price})),
    items:items.map(i=>({id:i.key,name:i.jccname||i.name,type:i.type2||'unknown'})),
    augments:augments.map(a=>({id:a.hexId,name:a.jccname||a.name})),comps};
}
