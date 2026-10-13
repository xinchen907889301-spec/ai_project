import { chromium } from 'playwright';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { normalize } from './normalize-datatft.mjs';

// Visit the ordinary public page. Do not reproduce signatures, scrape logins, or bypass challenges.
const season=process.env.DATA_SEASON||'18';
if(!/^\d+(\.\d+)?$/.test(season))throw Error('Invalid season');
const sourceUrl=`https://jcc.datatft.com/h5?season=${season}`;
let proxy;
if(process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY);proxy={server:u.origin};if(u.username)proxy.username=decodeURIComponent(u.username);if(u.password)proxy.password=decodeURIComponent(u.password);}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,proxy,args:['--disable-dev-shm-usage']});
try {
  const page=await browser.newPage();
  // route.fetch uses Node's trusted certificate store including NODE_EXTRA_CA_CERTS.
  // TLS checks remain enabled. Only required public website resources are requested.
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(!['jcc.datatft.com','api.datatft.com'].includes(u.hostname)){await route.abort();return;}
    try{await route.fulfill({response:await route.fetch({timeout:20000,maxRetries:0})});}catch{await route.abort();}
  });
  let db;
  const databaseReady=page.waitForResponse(r=>r.url().includes(`/h5-data-cn-${season}-`)&&r.url().endsWith('.json'),{timeout:30000}).then(r=>r.json()).then(d=>{db=d;});
  const rankReady=page.waitForResponse(r=>new URL(r.url()).hostname==='api.datatft.com'&&new URL(r.url()).pathname==='/team/list',{timeout:30000});
  // Install rejection handlers before navigation, so navigation errors cannot leave unhandled promises.
  const combined=Promise.all([databaseReady,rankReady]);combined.catch(()=>{});
  await page.goto(sourceUrl,{waitUntil:'domcontentloaded',timeout:30000});
  const [,response]=await combined;
  if(response.status()!==200)throw Error(`网站返回 HTTP ${response.status()}`);
  await page.locator('.h5-card-stats').first().waitFor({timeout:15000});
  const payload=await response.json(),metadata={sourceUrl,fetchedAt:new Date().toISOString(),platform:response.request().headers()['app-platform'],filters:response.request().postDataJSON()};
  const catalog=normalize(payload,db,metadata);
  await mkdir('.local/datatft',{recursive:true});await mkdir('app/public',{recursive:true});
  await writeFile('.local/datatft/snapshot.json',JSON.stringify({metadata,payload,database:db}));
  await writeFile('app/public/catalog.json.tmp',JSON.stringify(catalog,null,2));await rename('app/public/catalog.json.tmp','app/public/catalog.json');
  console.log(`已更新 ${catalog.comps.length} 套金铲铲阵容；补丁与统计口径仍待核验。`);
}finally{await browser.close();}
