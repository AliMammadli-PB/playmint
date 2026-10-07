"use server";
import {eq,and} from "drizzle-orm";
import {revalidatePath} from "next/cache";
import {db,schema} from "@/lib/db";
import {requireAdmin} from "@/lib/auth";
import {isLocale} from "@/lib/i18n/config";
export async function resolveRequest(form:FormData){const l=form.get("locale"),locale=isLocale(l)?l:"tr";const admin=await requireAdmin(locale),id=Number(form.get("id"));if(!Number.isSafeInteger(id)||id<1)return;await db.transaction(async tx=>{const row=(await tx.select().from(schema.auditLog).where(and(eq(schema.auditLog.id,id),eq(schema.auditLog.action,"platform.report"))).for("update"))[0];if(!row)return;await tx.update(schema.auditLog).set({data:{...(row.data as object),status:"resolved",resolvedBy:admin.id,resolvedAt:new Date().toISOString()}}).where(eq(schema.auditLog.id,id));});revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/requests`);}
