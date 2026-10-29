import { and, asc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { COMMUNITY_PRESENCE_TTL_MS } from "@/lib/community/service";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params;const db=await getDb(),now=Date.now();
 const room=await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id,id)).get();const member=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).get();
 if(!room||room.status!=="active"||member?.status!=="active")return jsonError(404,"not_found","Room not found.");
 const active=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.status,"active"),gte(schema.studyRoomMembers.lastSeenAt,now-COMMUNITY_PRESENCE_TTL_MS))).orderBy(asc(schema.studyRoomMembers.joinedAt)).all();
 const others=active.filter(m=>m.userId!==user.id);
 await db.transaction(async tx=>{
  await tx.update(schema.studyRoomMembers).set({status:"left",handRaisedAt:null}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).run();
  if(room.hostUserId===user.id){
   const next=others[0];
   if(next){await tx.update(schema.studyRoomMembers).set({role:"member"}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).run();await tx.update(schema.studyRoomMembers).set({role:"host"}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,next.userId))).run();await tx.update(schema.studyRooms).set({hostUserId:next.userId,updatedAt:now}).where(eq(schema.studyRooms.id,id)).run();}
   else await tx.update(schema.studyRooms).set({status:"ended",endedAt:now,updatedAt:now,timerStatus:"completed",timerEndsAt:null}).where(eq(schema.studyRooms.id,id)).run();
  }
 });return NextResponse.json({ok:true,ended:room.hostUserId===user.id&&others.length===0});
}
