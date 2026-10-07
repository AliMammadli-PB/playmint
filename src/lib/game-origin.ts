/** A runtime with allow-same-origin must be on a different HTTPS hostname. */
export function validateGameOrigin(value:string,siteUrl:string):string{
 if(!value.trim())return "";
 let game:URL,site:URL;try{game=new URL(value);site=new URL(siteUrl);}catch{throw new Error("Invalid GAME_ORIGIN");}
 if(game.protocol!=="https:"||game.username||game.password||game.pathname!=="/"||game.search||game.hash||game.hostname===site.hostname)throw new Error("GAME_ORIGIN must be a separate HTTPS hostname without a path or credentials");
 return game.origin;
}
