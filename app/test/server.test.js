import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../server.js';
import {readFile} from 'node:fs/promises';
test('server serves app, protects vision, reports missing model and rejects traversal',async()=>{
 const server=createServer({token:'testing-access-token',visionKey:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base)).status,200);const c=await (await fetch(base+'/catalog.json')).json();assert.equal(c.platform,'jcc');assert.ok(c.comps.length>0);
  assert.equal((await fetch(base+'/api/vision',{method:'POST',body:'{}'})).status,401);
  const r=await fetch(base+'/api/vision',{method:'POST',headers:{Authorization:'Bearer testing-access-token','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,503);assert.match((await r.json()).error,/尚未配置/);
  assert.equal((await fetch(base+'/%2e%2e%2fserver.js')).status,403);
  assert.equal((await fetch(base+'/unknown-file')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
test('vision adapter filters invented identifiers and always requires confirmation',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
 const server=createServer({token:'test-token',visionKey:'test-key',visionUrl:'https://example.invalid/vision',visionModel:'test-model',fetch:async(url,options)=>{
  assert.equal(url,'https://example.invalid/vision');assert.ok(JSON.parse(options.body).messages[0].content.includes('不要推测'));
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({phase:'planning',round:'2-5',items:[catalog.items[0].id,'invented'],heroes:[],augments:[],uncertain:['画面名称遮挡']})}}]}),{status:200});
 }});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const r=await fetch(`http://127.0.0.1:${server.address().port}/api/vision`,{method:'POST',headers:{Authorization:'Bearer test-token','Content-Type':'application/json'},body:JSON.stringify({image:'data:image/png;base64,iVBORw0KGgo='})});
  assert.equal(r.status,200);const d=await r.json();assert.equal(d.requiresConfirmation,true);assert.deepEqual(d.draft.items,[catalog.items[0].id]);assert.ok(d.draft.uncertain.length>=2);
 }finally{await new Promise(r=>server.close(r));}
});
