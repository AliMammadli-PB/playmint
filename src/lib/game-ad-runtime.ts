import 'server-only';
import {getAdConfig} from '@/lib/ad-config';
/** Keep native game parsing intact: ad shell boots the original document after the startup placement. */
export async function gameRuntimeHtml(original:string,gameId:string,preview:boolean){const config=await getAdConfig(gameId);if(preview)config.enabled=false;
 const data=JSON.stringify(config).replace(/</g,'\\u003c');
 const setup=`<script>window.__PLAYMINT_CONFIG=${data};</script><script src="https://playmint.tr/playmint-sdk.js?v=2"></script>`;
 const insert=(html:string)=>/<head\b[^>]*>/i.test(html)?html.replace(/<head\b[^>]*>/i,m=>m+setup):`<head>${setup}</head>${html}`;
 if(!config.enabled)return insert(original);
 const game=JSON.stringify(insert(original)).replace(/</g,'\\u003c');
 // Google code is on the game document; no synthetic videos or client-side revenue amounts.
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${setup}<script>window.adsbygoogle=window.adsbygoogle||[];window.adBreak=window.adConfig=function(o){adsbygoogle.push(o)};</script><script async crossorigin="anonymous" data-ad-channel="${config.channelId}" data-ad-frequency-hint="${config.intervalSeconds}s" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisher}"></script></head><body style="margin:0;background:#f6faf8"><p style="font:14px system-ui;text-align:center;padding:20vh 1rem;color:#087c59">Playmint</p><script>(function(){var started=false;function boot(){if(started)return;started=true;document.open();document.write(${game});document.close();}var limit=setTimeout(boot,8000);adConfig({preloadAdBreaks:'on',onReady:function(){if(started)return;clearTimeout(limit);__playmintStartup().then(boot,boot);}});})();</script></body></html>`;
}
