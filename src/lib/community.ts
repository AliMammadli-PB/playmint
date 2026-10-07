import "server-only";
import {and,desc,eq,or,sql} from "drizzle-orm";
import {db,schema} from "@/lib/db";
const u=schema.users,d=schema.developerProfiles,f=schema.userFollows;
export function communityFields(viewerId?:string){return {id:u.id,name:sql<string>`coalesce(${d.displayName},${u.name})`,handle:sql<string>`coalesce(${d.handle},${u.username},${u.id})`,role:u.role,bio:d.bio,website:d.website,followers:sql<number>`(select count(*)::int from user_follows uf join users member on member.id=uf.follower_id where uf.following_id=${u.id} and member.banned=false)`,followingCount:sql<number>`(select count(*)::int from user_follows uf join users member on member.id=uf.following_id where uf.follower_id=${u.id} and member.banned=false)`,following:viewerId?sql<boolean>`exists(select 1 from user_follows uf where uf.follower_id=${viewerId} and uf.following_id=${u.id})`:sql<boolean>`false`};}
export type CommunityProfile={id:string;name:string;handle:string;role:string;bio:string|null;website:string|null;followers:number;followingCount:number;following:boolean};
export async function publicProfile(handle:string,viewerId?:string){return (await db.select(communityFields(viewerId)).from(u).leftJoin(d,eq(d.userId,u.id)).where(and(eq(u.banned,false),or(eq(d.handle,handle),eq(u.username,handle),eq(u.id,handle)))).orderBy(sql`case when ${d.handle}=${handle} then 0 else 1 end`).limit(1))[0]??null;}
export async function profileById(id:string,viewerId?:string){return (await db.select(communityFields(viewerId)).from(u).leftJoin(d,eq(d.userId,u.id)).where(and(eq(u.id,id),eq(u.banned,false))).limit(1))[0]??null;}
export async function people(q="",viewerId?:string,offset=0){const search=q.trim().slice(0,80),like=`%${search.replace(/[%_\\]/g,x=>`\\${x}`)}%`;return db.select(communityFields(viewerId)).from(u).leftJoin(d,eq(d.userId,u.id)).where(and(eq(u.banned,false),search?or(sql`${u.name} ilike ${like}`,sql`${u.username} ilike ${like}`,sql`${d.handle} ilike ${like}`,sql`${d.displayName} ilike ${like}`):undefined)).orderBy(desc(u.createdAt),u.id).limit(24).offset(offset);}
export async function connections(userId:string,kind:"followers"|"following",viewerId?:string,offset=0){return db.select(communityFields(viewerId)).from(u).leftJoin(d,eq(d.userId,u.id)).innerJoin(f,kind==="followers"?eq(f.followerId,u.id):eq(f.followingId,u.id)).where(and(eq(u.banned,false),kind==="followers"?eq(f.followingId,userId):eq(f.followerId,userId))).orderBy(desc(f.createdAt),u.id).limit(51).offset(offset);}
export class FollowError extends Error{constructor(public code:string){super(code);}}
export async function setFollow(followerId:string,targetId:string,following:boolean){if(followerId===targetId)throw new FollowError("self_follow");return db.transaction(async tx=>{
 await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`follow:${followerId}:${targetId}`}))`);
 const target=(await tx.select({id:u.id}).from(u).where(and(eq(u.id,targetId),eq(u.banned,false))).limit(1))[0];if(!target)throw new FollowError("not_found");
 if(following)await tx.insert(f).values({followerId,followingId:targetId}).onConflictDoNothing();else await tx.delete(f).where(and(eq(f.followerId,followerId),eq(f.followingId,targetId)));
 const [count]=await tx.select({n:sql<number>`count(*)::int`}).from(f).innerJoin(u,eq(u.id,f.followerId)).where(and(eq(f.followingId,targetId),eq(u.banned,false)));
 return {following,followers:count.n};
 });}
