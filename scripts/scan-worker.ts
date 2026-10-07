import {and,eq,sql} from 'drizzle-orm';
import {db,schema} from '../src/lib/db';
import {scanVersion} from '../src/lib/virustotal';
async function run(){while(true){try{const pending=await db.select({id:schema.gameVersions.id}).from(schema.gameVersions).where(and(eq(schema.gameVersions.status,'pending'),eq(schema.gameVersions.runtimeKind,'browser'),sql`coalesce(${schema.gameVersions.report}->'virustotal'->>'status','pending') <> 'completed'`)).orderBy(sql`coalesce(${schema.gameVersions.report}->'virustotal'->>'updatedAt',${schema.gameVersions.createdAt}::text) asc`).limit(1);if(pending[0])await scanVersion(pending[0].id);}catch{console.error('VirusTotal worker pass failed; will retry.');}await new Promise(r=>setTimeout(r,30000));}}
void run();
