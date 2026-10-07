import {GET as serveGame} from '@/app/play/[...path]/route';
export async function GET(req:Request,ctx:RouteContext<'/game-runtime/[...path]'>){
 if(req.headers.get('host')?.split(':')[0]!=='games.playmint.tr')return new Response('Not found',{status:404});
 const response=await serveGame(req,{params:ctx.params});response.headers.set('Content-Security-Policy',"sandbox allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms allow-modals allow-downloads; frame-ancestors https://playmint.tr");return response;
}
