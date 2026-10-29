import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { isLevel } from "@/lib/levels";
import { grammarLesson } from "@/lib/grammar/course";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ level: string }> }) {
 const user=await currentUser(); if(!user) return unauthorized(); const level=(await params).level.toUpperCase();
 if(!isLevel(level)) return jsonError(404,"not_found","Unknown level"); const db=await getDb();
 const rows=await db.select().from(schema.grammarProgress).where(and(eq(schema.grammarProgress.userId,user.id),eq(schema.grammarProgress.level,level)));
 return NextResponse.json(rows);
}
export async function PUT(req: Request,{params}:{params:Promise<{level:string}>}) {
 const user=await currentUser(); if(!user) return unauthorized(); const level=(await params).level.toUpperCase();
 if(!isLevel(level)) return jsonError(404,"not_found","Unknown level");
 const body=await req.json().catch(()=>null) as {lessonId?:string;completed?:boolean;favorite?:boolean}|null;
 if(!body?.lessonId||!grammarLesson(level,body.lessonId)||typeof body.completed!=="boolean"&&typeof body.favorite!=="boolean") return jsonError(400,"invalid_input","Invalid lesson progress");
 const db=await getDb(); const table=schema.grammarProgress; const where=and(eq(table.userId,user.id),eq(table.level,level),eq(table.lessonId,body.lessonId));
 const [old]=await db.select().from(table).where(where); const now=Date.now();
 const completed=body.completed??Boolean(old?.completed); const favorite=body.favorite??Boolean(old?.favorite);
 await db.insert(table).values({userId:user.id,level,lessonId:body.lessonId,completed:Number(completed),favorite:Number(favorite),updatedAt:now}).onConflictDoUpdate({target:[table.userId,table.level,table.lessonId],set:{completed:Number(completed),favorite:Number(favorite),updatedAt:now}});
 return NextResponse.json({lessonId:body.lessonId,completed,favorite});
}
