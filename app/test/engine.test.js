import test from 'node:test';
import assert from 'node:assert/strict';
import {recordObservation,inferDirections,analyze} from '../public/engine.js';
const now=Date.now();
const cat={season:'18',patch:null,fetchedAt:new Date(now).toISOString(),caveats:[],items:[{id:'ad',type:'complete'},{id:'ap',type:'complete'},{id:'part',type:'part'}],augments:[{id:'specific'}],heroes:[{id:'low',cost:1},{id:'carry',cost:4}],comps:[
 {id:'a',coreHero:'carry',requiredAugments:[],units:[{hero:'carry',cost:4,items:['ad']},{hero:'low',cost:1,items:[]}],stats:{averagePlace:4,top4Pct:50,winPct:10}},
 {id:'b',coreHero:'other',requiredAugments:[],units:[{hero:'other',cost:4,items:['ad']}],stats:{averagePlace:4.1,top4Pct:49,winPct:12}},
 {id:'c',coreHero:'mage',requiredAugments:['specific'],units:[{hero:'mage',cost:4,items:['ap']}],stats:{averagePlace:3,top4Pct:70,winPct:25}}]};
const obs=(fields={})=>({slot:'self',round:'2-5',phase:'planning',season:'18',confirmed:true,observedAt:new Date(now-1000).toISOString(),items:['ad'],heroes:[],augments:[],...fields});
test('early directions can be inferred from equipment without a four-cost carry',()=>{
 const r=inferDirections(obs(),cat);assert.equal(r.length,2);assert.equal(r[0].score,r[1].score);assert.ok(r.every(x=>!x.confirmedCore));
 assert.equal(inferDirections(obs({items:[],heroes:['carry']}),cat).length,0);
 assert.ok(inferDirections(obs({items:[],heroes:['carry'],round:'4-1'}),cat)[0].confirmedCore);
});
test('components and generic transition heroes do not become strong direction evidence',()=>{
 assert.deepEqual(inferDirections(obs({items:['part']}),cat),[]);
 assert.equal(analyze({self:obs({items:[],heroes:['low']})},cat,{round:'2-5',now}).recommendations.length,0);
});
test('late responses cannot overwrite newer observations; duplicates refresh freshness only',()=>{
 let r=recordObservation({},obs(),cat,now);
 const changedAt=r.records.self.changedAt;
 r=recordObservation(r.records,obs({observedAt:new Date(now).toISOString()}),cat,now);
 assert.equal(r.status,'unchanged');assert.equal(r.records.self.changedAt,changedAt);
 assert.equal(recordObservation(r.records,obs(),cat,now).status,'outdated');
 assert.equal(recordObservation(r.records,obs({round:'2-3',observedAt:new Date(now+1).toISOString()}),cat,now).status,'outdated');
});
test('combat, unconfirmed, wrong-season and unknown IDs are rejected',()=>{
 for(const fields of [{phase:'combat'},{confirmed:false},{season:'17'},{items:['invented']},{slot:'p8'}])assert.throws(()=>recordObservation({},obs(fields),cat,now));
});
test('ambiguous opponents remain multiple candidates; stale observations do not add current competition',()=>{
 const r=analyze({self:obs(),p1:obs({slot:'p1'}),p2:obs({slot:'p2',round:'2-3'})},cat,{round:'2-5',now});
 assert.equal(r.opponents[0].candidates.length,2);
 assert.deepEqual(r.recommendations[0].potential,['p1']);assert.deepEqual(r.recommendations[0].oldPotential,['p2']);
 assert.equal(r.opponents.filter(p=>p.observation).length,2);
});
test('specific augment requirements are not silently assumed; changing evidence changes direction',()=>{
 const r=analyze({self:obs({items:['ap']})},cat,{round:'2-5',now});assert.equal(r.recommendations[0].eligible,false);
 const r2=analyze({self:obs({items:['ap'],augments:['specific']})},cat,{round:'2-5',now});assert.equal(r2.recommendations[0].eligible,true);
 assert.equal(analyze({self:obs({round:'2-3'})},cat,{round:'2-5',now}).status,'need_self_update');
});
