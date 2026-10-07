import {getCurrentUser} from '@/lib/auth';
import {googleReportCsv} from '@/lib/google-ad-reports';
export async function GET(req:Request){const user=await getCurrentUser();if(!user||user.role!=='admin')return Response.json({error:'forbidden'},{status:403});try{const result=await googleReportCsv(new URL(req.url).searchParams.get('period')??'');return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'report_unavailable'},{status:503});}}
