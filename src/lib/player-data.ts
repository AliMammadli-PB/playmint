import "server-only";
import {and,eq,desc,sql} from "drizzle-orm";
import {db,schema} from "@/lib/db";
import {cardFields,publicGameCondition} from "@/lib/games";
export async function playerLibrary(userId:string){const g=schema.games,d=schema.developerProfiles;return Promise.all([
 db.select(cardFields).from(schema.likes).innerJoin(g,eq(g.id,schema.likes.gameId)).leftJoin(d,eq(d.userId,g.developerId)).where(and(eq(schema.likes.userId,userId),publicGameCondition)).orderBy(desc(schema.likes.createdAt)).limit(48),
 db.select({...cardFields,last:sql<string>`max(${schema.userGameDaily.day})`}).from(schema.userGameDaily).innerJoin(g,eq(g.id,schema.userGameDaily.gameId)).leftJoin(d,eq(d.userId,g.developerId)).where(and(eq(schema.userGameDaily.userId,userId),publicGameCondition)).groupBy(g.id,d.userId).orderBy(desc(sql`max(${schema.userGameDaily.day})`)).limit(24)
]);}
