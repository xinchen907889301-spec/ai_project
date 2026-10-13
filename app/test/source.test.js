import test from 'node:test';import assert from 'node:assert/strict';import {normalize} from '../../scripts/normalize-datatft.mjs';
const database={heros18:[{chessId:1,key:'hero',displayName:'英雄',price:4}],equips18:[{key:'item',name:'装备'}],hexs18:[[{hexId:'augment',name:'强化'}]]};
const payload={success:true,code:1,data:{count:'100',list:[{id:1,title:'示例',heroId:1,titleApi:['augment'],heros:[{id:1,key:'hero',tftEquips:['item']}],place:4,top4:50,won:10,playRate:.2,tier:'A',score:99}]}};
const metadata={platform:'jcc',filters:{season:'18',tier:'grandmaster',time:5},fetchedAt:'2026-10-13T00:00:00Z'};
test('source preserves raw denominators and unknown patch instead of inventing statistics',()=>{
 const c=normalize(payload,database,metadata);assert.equal(c.patch,null);assert.equal(c.comps[0].stats.sampleSize,null);assert.equal(c.totalCountRaw,'100');assert.equal(c.comps[0].stats.pickRateRaw,.2);assert.deepEqual(c.comps[0].requiredAugments,['augment']);
});
test('wrong platform, changed response and invalid metrics fail closed',()=>{
 assert.throws(()=>normalize(payload,database,{...metadata,platform:'tft'}));assert.throws(()=>normalize({code:0},database,metadata));
 const bad=structuredClone(payload);bad.data.list[0].won=90;assert.throws(()=>normalize(bad,database,metadata));
});
