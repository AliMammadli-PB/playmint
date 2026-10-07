/** Device-local game state; no account/session data is exposed to an iframe. */
export const MAX_GAME_SAVE_BYTES=65536;
export function parseGameSave(input:unknown):Record<string,string>|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const entries=Object.entries(input);if(entries.length>100)return null;
 const result:Record<string,string>=Object.create(null);
 for(const [key,value] of entries){if(!/^[a-zA-Z0-9_.:-]{1,100}$/.test(key)||['__proto__','constructor','prototype'].includes(key)||typeof value!=='string'||value.length>32768)return null;result[key]=value;}
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_GAME_SAVE_BYTES)return null;
 return result;
}
export function readGameSave(storage:Pick<Storage,'getItem'>,gameId:string):Record<string,string>{try{return parseGameSave(JSON.parse(storage.getItem(`pm:game-save:${gameId}`)||'{}'))||{};}catch{return {};}}
