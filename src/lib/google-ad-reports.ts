import 'server-only';
export async function googleReportCsv(period:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error('invalid_period');
 const account=process.env.GOOGLE_ADSENSE_ACCOUNT_ID,client=process.env.GOOGLE_OAUTH_CLIENT_ID,secret=process.env.GOOGLE_OAUTH_CLIENT_SECRET,refresh=process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
 if(!account||!client||!secret||!refresh)throw new Error('report_api_not_configured');
 if(!/^pub-\d+$/.test(account))throw new Error('invalid_account');
 const token=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:client,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});if(!token.ok)throw new Error('report_auth_failed');const auth=await token.json();
 const [year,month]=period.split('-').map(Number),last=new Date(Date.UTC(year,month,0)).getUTCDate();
 const query=new URLSearchParams({'dateRange':'CUSTOM','startDate.year':String(year),'startDate.month':String(month),'startDate.day':'1','endDate.year':String(year),'endDate.month':String(month),'endDate.day':String(last),'dimensions':'CUSTOM_CHANNEL_ID','metrics':'ESTIMATED_EARNINGS'});
 const response=await fetch(`https://adsense.googleapis.com/v2/accounts/${account}/reports:generate?${query}`,{headers:{authorization:`Bearer ${auth.access_token}`},signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('report_unavailable');const report=await response.json();
 const csv=['channel_id,amount'];for(const row of report.rows??[]){const cells=row.cells??[],channel=String(cells[0]?.value??'').split(':').pop()!,amount=String(cells[1]?.value??'');if(!/^\d+$/.test(channel)||!/^\d+(\.\d{1,2})?$/.test(amount))throw new Error('report_format_unrecognized');if(Number(amount)>0)csv.push(`${channel},${amount}`);}return {csv:csv.join('\n'),currency:report.headers?.find((h:{name?:string})=>h.name==='ESTIMATED_EARNINGS')?.currencyCode??null};
}
