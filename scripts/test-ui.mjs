import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'体验演示局势'}).click();
 await page.locator('.card').first().waitFor();
 assert.equal(await page.locator('.slot').count(),8);assert.match(await page.locator('#coverage').innerText(),/2 \/ 7/);
 await page.locator('#expert').check();assert.ok(await page.locator('.stats').count()>0);
 await page.locator('.slot').nth(3).click();
 await page.locator('#item-search').fill('鬼索');
 await page.locator('#item-options button').first().click();
 await page.locator('#save').click();assert.match(await page.locator('#message').innerText(),/确认/);
 await page.locator('#confirmed').check();await page.locator('#save').click();assert.match(await page.locator('#coverage').innerText(),/3 \/ 7/);
 await page.locator('#round').fill('3-1');await page.locator('#round').press('Tab');assert.match(await page.locator('#advice-message').innerText(),/过期/);
 await page.locator('#round').fill('2-5');await page.locator('#round').press('Tab');
 await page.reload({waitUntil:'networkidle'});assert.match(await page.locator('#coverage').innerText(),/3 \/ 7/);
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/desktop.png',fullPage:true});
 await page.setViewportSize({width:412,height:915});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'.local/verification/mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('UI passed: demo, evidence editing, confirmation, freshness, persistence, desktop and mobile layout.');
}finally{await browser.close();}
