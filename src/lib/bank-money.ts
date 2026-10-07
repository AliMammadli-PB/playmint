export const MIN_WITHDRAWAL=100000;
export function normalizeIban(value:string){return value.replace(/\s/g,'').toUpperCase();}
export function validTrIban(value:string){const iban=normalizeIban(value);if(!/^TR\d{24}$/.test(iban))return false;const digits=(iban.slice(4)+iban.slice(0,4)).replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));let remainder=0;for(const digit of digits)remainder=(remainder*10+Number(digit))%97;return remainder===1;}
export function moneyMinor(value:string){if(!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(value.trim()))throw new Error('invalid_amount');const [whole,fraction='']=value.trim().replace(',','.').split('.');const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(result)||result>1000000000)throw new Error('invalid_amount');return result;}
export function splitSettlement(net:number,rows:{gameId:string;reportedMinor:number}[]){
 if(!Number.isSafeInteger(net)||net<=0||net>1000000000||!rows.length||rows.some(r=>!Number.isSafeInteger(r.reportedMinor)||r.reportedMinor<=0)||new Set(rows.map(r=>r.gameId)).size!==rows.length)throw new Error('invalid_distribution');
 const total=rows.reduce((a,r)=>a+BigInt(r.reportedMinor),BigInt(0)),pool=Math.floor(net/2);
 const allocate=(amount:number)=>{const result=rows.map(r=>({gameId:r.gameId,amount:Number(BigInt(amount)*BigInt(r.reportedMinor)/total),remainder:BigInt(amount)*BigInt(r.reportedMinor)%total}));let left=amount-result.reduce((a,r)=>a+r.amount,0);const sorted=[...result].sort((a,b)=>a.remainder===b.remainder?a.gameId.localeCompare(b.gameId):a.remainder>b.remainder?-1:1);for(let i=0;i<left;i++)sorted[i].amount++;return new Map(result.map(r=>[r.gameId,r.amount]));};
 const developer=allocate(pool),platform=allocate(net-pool);return rows.map(r=>({...r,developerCents:developer.get(r.gameId)!,platformCents:platform.get(r.gameId)!}));
}
