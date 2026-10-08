/** Build only reviewed browser code; never run upstream install hooks or server code. */
const fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const root=path.resolve(process.env.PLAYMINT_MOBILE_PREPARED||'work/mobile-games'),records=require('../catalogue/mobile/manifest.json');
async function checkout(key,repo,revision){const dir=path.join(root,key);try{await fs.stat(path.join(dir,'.git'));}catch{execFileSync('git',['clone','https://github.com/'+repo+'.git',dir],{stdio:'inherit'});}if(execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==revision){execFileSync('git',['-C',dir,'fetch','--depth','1','origin',revision],{stdio:'inherit'});execFileSync('git',['-C',dir,'checkout','--detach',revision],{stdio:'inherit'});}return dir;}
async function prepare(){await fs.mkdir(root,{recursive:true});await fs.mkdir(path.join(root,'runtime'),{recursive:true});
 for(const r of records){const dir=await checkout(r.key,r.repo,r.revision),out=path.join(root,'runtime',r.key);await fs.mkdir(out,{recursive:true});let html;
  if(r.key==='dante'){html=await fs.readFile(path.join(dir,'dist/3-bundle/index.html'),'utf8');
   // Adapt bracket-based saves to the bounded per-game device storage bridge.
   const count=(html.match(/localStorage\["Dante-22"\]/g)||[]).length;if(count!==3)throw Error('unexpected_dante_storage');
   html=html.replaceAll('localStorage["Dante-22"]','pmDanteSave.value');
   html=html.replace(/<head>/i,'<head><script>var pmDanteSave={get value(){return window.Playmint?.storage?.getItem("Dante-22")||""},set value(v){window.Playmint?.storage?.setItem("Dante-22",v)}};</script>');
   html=html.replace('user-scalable=0','user-scalable=1');
  }else if(r.key==='stolen-sword'){
   const copy=path.join(root,'stolen-sword-build');await fs.cp(path.join(dir,'src'),copy,{recursive:true});
   const state=path.join(copy,'state.js');await fs.writeFile(state,(await fs.readFile(state,'utf8')).replaceAll('window.localStorage','window.Playmint.storage'));
   const entry=path.join(copy,'index.js');await fs.writeFile(entry,(await fs.readFile(entry,'utf8')).replace('canvas.style.width = Math.floor(vw);','canvas.style.width = Math.floor(vw) + "px";').replace('canvas.style.height = Math.floor(vh);','canvas.style.height = Math.floor(vh) + "px";'));
   const esbuild=createRequire(require.resolve('tsx'))('esbuild');const result=await esbuild.build({entryPoints:[entry],bundle:true,write:false,minify:true,format:'iife',target:'es2020'});
   html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stolen Sword</title></head><body style="display:flex;justify-content:center;align-items:center;height:100dvh;margin:0;background:#000;overflow:hidden;user-select:none;touch-action:none;pointer-events:none"><canvas></canvas><script>'+result.outputFiles[0].text+'</script></body></html>';
  }else{
   const play=await checkout('jewelsback-play',r.repo,r.runtimeRevision);html=await fs.readFile(path.join(play,'index.html'),'utf8');
   // Omit optional external art/audio whose asset-specific licences are not recorded upstream.
   html=html.replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi,'').replace(/<meta[^>]*name="monetization"[^>]*>/gi,'');
   html=html.replace(/new Audio\(require\("\.\.\/audio\/[^"\n]+"\)\)/g,'({play:function(){return Promise.resolve()},pause:function(){}})');
   html=html.replace(/url\([^)]*\.webp[^)]*\)/g,'radial-gradient(circle,#ffd89b,transparent 70%)');
   html=html.replace('document.querySelector("#background svg").remove()','document.querySelector("#background svg")?.remove()');
   html=html.replace('</head>','<style>html,body{touch-action:none}button{touch-action:manipulation}</style></head>');
  }
  await fs.writeFile(path.join(out,'index.html'),html.replace(/^\uFEFF/,''));await fs.copyFile(path.join(dir,r.key==='stolen-sword'?'LICENSE.md':'LICENSE'),path.join(out,'LICENSE'));
  await fs.writeFile(path.join(out,'CREDITS.txt'),`${r.title}\nOriginal developer: ${r.author}\nMIT licence retained in LICENSE.\nSource: https://github.com/${r.repo}/tree/${r.revision}\n${r.runtimeRevision?'Runtime revision: '+r.runtimeRevision+'\n':''}Playmint adaptations: isolated device saves, viewport fixes; optional unverified Jewelsback external art/audio omitted.\n`);
  execFileSync('python3',['-c','import pathlib,sys,zipfile\nr=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED) as z:\n for f in sorted(r.rglob("*")):\n  if f.is_file():z.write(f,f.relative_to(r))',out,path.join(root,r.key+'.zip')]);console.log('prepared',r.key);
 }
}
prepare().catch(e=>{console.error(e);process.exitCode=1});
