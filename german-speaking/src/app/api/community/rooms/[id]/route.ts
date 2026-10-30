import { randomBytes } from "node:crypto";
import { and, eq, gte, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { COMMUNITY_MAX_CAPACITY, COMMUNITY_PRESENCE_TTL_MS, hashInviteToken } from "@/lib/community/service";
import { leaveVoice } from "@/lib/community/voice";
export const runtime="nodejs";export const dynamic="force-dynamic";
const Body=z.discriminatedUnion("action",[
 z.object({action:z.literal("update"),name:z.string().trim().min(3).max(70).optional(),description:z.string().trim().max(300).optional(),capacity:z.number().int().min(2).max(COMMUNITY_MAX_CAPACITY).optional(),goal:z.string().trim().max(160).optional(),approvalRequired:z.boolean().optional()}),
 z.object({action:z.literal("end")}),z.object({action:z.literal("rotateInvite")}),
]);
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params;const parsed=Body.safeParse(await readJson(req));if(!parsed.success)return jsonError(400,"invalid_body","Invalid room settings.");
 const db=await getDb(),room=await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id,id)).get();if(!room||room.hostUserId!==user.id)return jsonError(404,"not_found","Room not found.");const now=Date.now();
 if(parsed.data.action==="rotateInvite"){
  if(room.visibility!=="private"||room.status!=="active")return jsonError(400,"invalid_room","Only active private rooms have invitation links.");const token=randomBytes(32).toString("base64url");await db.update(schema.studyRooms).set({inviteTokenHash:hashInviteToken(token),updatedAt:now}).where(eq(schema.studyRooms.id,id)).run();await db.update(schema.studyRoomMembers).set({status:"rejected"}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.status,"pending"))).run();return NextResponse.json({inviteToken:token});
 }
 if(parsed.data.action==="end"){
  if(room.status!=="active")return jsonError(409,"room_ended","This room has already ended.");const members=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.status,"active"),gte(schema.studyRoomMembers.lastSeenAt,now-COMMUNITY_PRESENCE_TTL_MS))).all();const elapsed=room.timerElapsedMs+(room.timerStatus==="running"&&room.timerStartedAt?Math.max(0,now-room.timerStartedAt):0);const session=room.timerRunId?await db.select().from(schema.studyRoomSessions).where(eq(schema.studyRoomSessions.id,room.timerRunId)).get():undefined;
  await db.transaction(async tx=>{await tx.update(schema.studyRooms).set({status:"ended",endedAt:now,updatedAt:now,timerStatus:"completed",timerEndsAt:null,timerPausedRemainingMs:0,timerElapsedMs:elapsed}).where(and(eq(schema.studyRooms.id,id),eq(schema.studyRooms.status,"active"))).run();await tx.update(schema.studyRoomMembers).set({status:"left",handRaisedAt:null}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.status,"active"))).run();if(session&&!session.endedAt)await tx.update(schema.studyRoomSessions).set({endedAt:now,activeMilliseconds:elapsed,participantCount:members.length,completed:0}).where(and(eq(schema.studyRoomSessions.id,session.id),isNull(schema.studyRoomSessions.endedAt))).run();});
  await leaveVoice(id);
  return NextResponse.json({ended:true,summary:{durationMinutes:Math.floor(elapsed/60_000),participants:members.length,goal:room.goal,completed:false}});
 }
 if(room.status!=="active")return jsonError(409,"room_ended","This room has ended.");const {action,...patch}=parsed.data;if(action!=="update")return jsonError(400,"invalid_action","Invalid room action.");
 if(patch.capacity!==undefined){const active=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.status,"active"),gte(schema.studyRoomMembers.lastSeenAt,now-COMMUNITY_PRESENCE_TTL_MS))).all();if(patch.capacity<active.length)return jsonError(409,"capacity_too_low","Capacity cannot be lower than current participants.");}
 const { approvalRequired, ...settings } = patch;
 await db.update(schema.studyRooms).set({...settings,...(approvalRequired!==undefined?{approvalRequired:Number(approvalRequired)}:{}),updatedAt:now}).where(eq(schema.studyRooms.id,id)).run();return NextResponse.json({ok:true});
}
