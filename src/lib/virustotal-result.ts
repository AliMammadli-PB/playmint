export type VirusTotalReport = {
 status:'pending'|'not_configured'|'submitted'|'completed'|'error'|'runtime_missing';
 updatedAt:string;sha256?:string;analysisId?:string;error?:string;
 stats?:Record<string,number>;detections?:{engine:string;category:string;result:string}[];
};
export function scanAllowsApproval(scan?:VirusTotalReport){return !!scan&&scan.status==='completed'&&!!scan.sha256&&(scan.stats?.malicious??0)===0&&(scan.stats?.suspicious??0)===0&&((scan.stats?.undetected??0)+(scan.stats?.harmless??0))>0;}
export function parseAnalysis(attributes:Record<string,unknown>,previous:VirusTotalReport):VirusTotalReport{
 const stats:Record<string,number>={};for(const [key,value] of Object.entries((attributes.stats??{}) as Record<string,unknown>)){if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)stats[key]=value;}
 const detections=[];for(const [engine,value] of Object.entries((attributes.results??{}) as Record<string,{category?:string;result?:string;engine_name?:string}>)){if(value.category==='malicious'||value.category==='suspicious')detections.push({engine:String(value.engine_name??engine).slice(0,150),category:value.category,result:String(value.result??'').slice(0,500)});}
 return {...previous,status:attributes.status==='completed'?'completed':'submitted',updatedAt:new Date().toISOString(),stats,detections:detections.slice(0,200),error:undefined};
}
