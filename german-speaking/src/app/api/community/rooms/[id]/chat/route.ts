import { and, asc, count, desc, eq, gte, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { findRoomMember, COMMUNITY_MAX_MESSAGE_LENGTH } from "@/lib/community/service";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params;const member=await findRoomMember(id,user.id);if(member?.status!=="active")return jsonError(404,"not_found","Room not found.");
 const db=await getDb(),raw=new URL(req.url).searchParams.get("after"),after=raw&&/^\d+$/.test(raw)?Number(raw):0;
 const messages=after?await db.select().from(schema.studyRoomMessages).where(and(eq(schema.studyRoomMessages.roomId,id),gt(schema.studyRoomMessages.id,after))).orderBy(asc(schema.studyRoomMessages.id)).limit(80).all():await db.select().from(schema.studyRoomMessages).where(eq(schema.studyRoomMessages.roomId,id)).orderBy(desc(schema.studyRoomMessages.id)).limit(50).all().then(rows=>rows.reverse());
 const ids=[...new Set(messages.map(m=>m.userId))],users=ids.length?await db.select({id:schema.users.id,name:schema.users.name,username:schema.users.username,photo:schema.users.photo}).from(schema.users).where(inArray(schema.users.id,ids)).all():[];const byId=new Map(users.map(u=>[u.id,u]));
 return NextResponse.json({messages:messages.map(m=>({id:m.id,body:m.body,createdAt:m.createdAt,user:{id:m.userId,name:byId.get(m.userId)?.name||byId.get(m.userId)?.username||"Student",photo:byId.get(m.userId)?.photo??null}})),next:messages.at(-1)?.id??after});
}
const Body=z.object({body:z.string().trim().min(1).max(COMMUNITY_MAX_MESSAGE_LENGTH)});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params,member=await findRoomMember(id,user.id);if(member?.status!=="active")return jsonError(404,"not_found","Room not found.");
 const parsed=Body.safeParse(await readJson(req));if(!parsed.success)return jsonError(400,"invalid_message","Messages must contain 1 to 1000 characters.");const db=await getDb();const room=await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id,id)).get();if(!room||room.status!=="active")return jsonError(410,"room_ended","This room has ended.");
 const now=Date.now(),recent=await db.select({n:count()}).from(schema.studyRoomMessages).where(and(eq(schema.studyRoomMessages.roomId,id),eq(schema.studyRoomMessages.userId,user.id),gte(schema.studyRoomMessages.createdAt,now-60_000))).get();if((recent?.n??0)>=20)return jsonError(429,"slow_down","Please wait before sending more messages.");
 const [row]=await db.insert(schema.studyRoomMessages).values({roomId:id,userId:user.id,body:parsed.data.body,createdAt:now}).returning();return NextResponse.json({message:{id:row.id,body:row.body,createdAt:row.createdAt,user:{id:user.id,name:user.name||user.username||"Student",photo:user.photo}}},{status:201});
}
