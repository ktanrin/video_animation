import {resolve} from 'node:path'
import {mkdirSync} from 'node:fs'
mkdirSync('qa',{recursive:true})
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5180'
import assert from 'node:assert/strict'
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.cache/ms-playwright')
const {chromium}=await import('playwright')
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1920,height:1080}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 for(const dir of ['21','03']){
  await page.goto(`${base}/video.html?direction=${dir}`)
  await page.waitForFunction(()=>window.__PELLICULE_READY__)
  for(const frame of [0,120,359,360,420,480,780,899]){
   await page.evaluate(f=>window.__PELLICULE_SET_FRAME__(f),frame)
   assert.equal(await page.locator('[data-aircraft="ARR 01"]').count(),1)
   assert.equal(await page.locator('[data-panel="radar"] [data-aircraft]').count(),frame<360?1:0)
   assert.equal(await page.locator('[data-panel="aerodrome"] [data-aircraft]').count(),frame<360?0:1)
   if(frame===120||frame===780)await page.screenshot({path:`qa/arrival-${dir}-${frame}.png`})
  }
  assert.equal(await page.locator(`[data-localizer="${dir==='21'?'21R':'03L'}"]`).count(),1)
 }
 await page.goto(base)
 await page.selectOption('#direction','03')
 await page.getByRole('button',{name:'Play',exact:true}).click()
 await page.waitForTimeout(300)
 await page.getByRole('button',{name:'Pause',exact:true}).click()
 await page.locator('.scrubber').fill('360');await page.locator('.scrubber').dispatchEvent('input')
 assert.equal(await page.locator('[data-panel="aerodrome"] [data-aircraft]').count(),1)
 await page.getByRole('button',{name:'Export video'}).click()
 assert.match(await page.locator('.export-dialog pre').innerText(),/--direction=03 --movement=arrival/)
 await page.getByRole('button',{name:'Got it'}).click()
 await page.screenshot({path:'qa/linked-arrival-studio.png'})
 await page.selectOption('#movement','departure')
 assert.equal(await page.locator('[data-aircraft="DEMO 01"]').count(),1)
 assert.equal(await page.locator('#direction').inputValue(),'21')
 await page.setViewportSize({width:390,height:844})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 assert.deepEqual(errors,[])
 console.log('Both directions, single-aircraft handoff, export selection, departure compatibility and mobile passed')
}finally{await browser.close()}
