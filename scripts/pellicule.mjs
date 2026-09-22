import { spawnSync } from 'node:child_process'
import { dirname, delimiter, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import ffmpegPath from 'ffmpeg-static'
const require=createRequire(import.meta.url)
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
process.chdir(root)
const localBrowsers=resolve(root,'.cache/ms-playwright')
const env={...process.env,PATH:`${dirname(ffmpegPath)}${delimiter}${process.env.PATH||''}`,PLAYWRIGHT_BROWSERS_PATH:localBrowsers}
const mode=process.argv[2]||'render'
if(!['setup','preview','sample','render'].includes(mode))throw new Error(`Unknown command: ${mode}`)
if(mode==='setup'){
  mkdirSync(localBrowsers,{recursive:true})
  const cli=resolve(dirname(require.resolve('playwright/package.json')),'cli.js')
  const result=spawnSync(process.execPath,[cli,'install','chromium'],{env,stdio:'inherit'})
  process.exit(result.status??1)
}
if(!existsSync(ffmpegPath))throw new Error('FFmpeg was not installed. Run npm install again with lifecycle scripts enabled.')
mkdirSync(resolve(root,'renders'),{recursive:true})
// Set before loading Playwright: it resolves its browser directory on import.
process.env.PATH=env.PATH
process.env.PLAYWRIGHT_BROWSERS_PATH=env.PLAYWRIGHT_BROWSERS_PATH
const { createServer }=await import('vite')
const server=await createServer({root,configFile:resolve(root,'vite.config.js'),server:{host:'127.0.0.1',port:mode==='preview'?5175:0},logLevel:'warn'})
await server.listen()
const url=`http://127.0.0.1:${server.httpServer.address().port}/video.html`
if(mode==='preview'){
  console.log(`Pellicule preview: ${url}?preview=1&fps=30&duration=900&width=1920&height=1080`)
  console.log('Press Ctrl+C to stop.')
  process.once('SIGINT',async()=>{await server.close();process.exit(0)})
}else{
  try{
    const { renderToMp4 }=await import('pellicule/render')
    await renderToMp4({input:resolve(root,'Video.vue'),serverUrl:url,width:1920,height:1080,fps:30,durationInFrames:mode==='sample'?90:900,output:resolve(root,`renders/vtbd-${mode==='sample'?'sample':'departure'}.mp4`),quality:'high',silent:true,onProgress:p=>{if(p.frame%30===0)console.log(`Rendering frame ${p.frame} / ${p.total}`)}})
    console.log(`Saved renders/vtbd-${mode==='sample'?'sample':'departure'}.mp4`)
  }finally{await server.close()}
}
