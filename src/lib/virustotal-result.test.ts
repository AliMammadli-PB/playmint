import {expect,test} from 'vitest';
import {scanAllowsApproval,parseAnalysis,type VirusTotalReport} from './virustotal-result';
const base:VirusTotalReport={status:'submitted',sha256:'a'.repeat(64),analysisId:'analysis',updatedAt:new Date().toISOString()};
test('queued, missing credentials, failures and unsupported-only scans cannot authorize publishing',()=>{
 for(const status of ['pending','submitted','not_configured','error'] as const)expect(scanAllowsApproval({...base,status})).toBe(false);
 expect(scanAllowsApproval({...base,status:'completed',stats:{'type-unsupported':40}})).toBe(false);
 expect(scanAllowsApproval()).toBe(false);
});
test('malicious and suspicious findings block approval and preserve named engine findings',()=>{
 const scan=parseAnalysis({status:'completed',stats:{malicious:1,suspicious:1,undetected:60},results:{A:{engine_name:'Engine A',category:'malicious',result:'Trojan.Test'},B:{category:'suspicious',result:'Heuristic'},C:{category:'undetected'}}},base);
 expect(scanAllowsApproval(scan)).toBe(false);expect(scan.detections).toEqual([{engine:'Engine A',category:'malicious',result:'Trojan.Test'},{engine:'B',category:'suspicious',result:'Heuristic'}]);
});
test('finished scans with supported checks and no findings allow manual approval',()=>{
 const scan=parseAnalysis({status:'completed',stats:{malicious:0,suspicious:0,undetected:68,harmless:2}},base);
 expect(scanAllowsApproval(scan)).toBe(true);expect(scan.sha256).toBe(base.sha256);
 expect(scanAllowsApproval({...scan,status:'submitted'})).toBe(false);
});
