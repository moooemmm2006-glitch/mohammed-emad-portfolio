import { randomUUID } from "node:crypto";
import { and, eq, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { findRoomMember, roomMemberCount } from "@/lib/community/service";
export const runtime="nodejs";export const dynamic="force-dynamic";
const Body=z.object({action:z.enum(["start","pause","resume","reset","break","complete"])});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params,parsed=Body.safeParse(await readJson(req));if(!parsed.success)return jsonError(400,"invalid_body","Invalid timer action.");
 const db=await getDb(),room=await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id,id)).get(),member=await findRoomMember(id,user.id);if(!room||room.status!=="active"||member?.status!=="active")return jsonError(404,"not_found","Room not found.");
 const {action}=parsed.data,host=room.hostUserId===user.id,now=Date.now();if(action!=="complete"&&!host)return jsonError(403,"host_only","Only the host controls the shared timer.");
 if(action==="start"){
  if(room.timerStatus==="running"||room.timerStatus==="paused")return jsonError(409,"timer_active","Pause or finish the current timer first.");const runId=randomUUID(),members=await roomMemberCount(id,now),minutes=room.timerDurationMinutes;
  await db.transaction(async tx=>{if(room.timerRunId)await tx.update(schema.studyRoomSessions).set({endedAt:now,activeMilliseconds:room.timerElapsedMs,participantCount:members,completed:0}).where(and(eq(schema.studyRoomSessions.id,room.timerRunId),isNull(schema.studyRoomSessions.endedAt))).run();await tx.insert(schema.studyRoomSessions).values({id:runId,roomId:id,startedAt:now,activeMilliseconds:0,goal:room.goal,participantCount:members,completed:0}).run();await tx.update(schema.studyRooms).set({timerStatus:"running",timerPhase:"focus",timerStartedAt:now,timerEndsAt:now+minutes*60_000,timerPausedRemainingMs:null,timerElapsedMs:0,timerRunId:runId,updatedAt:now}).where(and(eq(schema.studyRooms.id,id),eq(schema.studyRooms.status,"active"))).run();});return NextResponse.json({ok:true});
 }
 if(action==="pause"){
  if(room.timerStatus!=="running"||!room.timerEndsAt||room.timerEndsAt<=now)return jsonError(409,"timer_not_running","The shared timer is not running.");const segment=Math.max(0,now-(room.timerStartedAt??now)),remaining=Math.max(0,room.timerEndsAt-now);
  await db.update(schema.studyRooms).set({timerStatus:"paused",timerPausedRemainingMs:remaining,timerEndsAt:null,timerStartedAt:null,timerElapsedMs:room.timerElapsedMs+segment,updatedAt:now}).where(and(eq(schema.studyRooms.id,id),eq(schema.studyRooms.timerStatus,"running"))).run();return NextResponse.json({ok:true});
 }
 if(action==="resume"){
  if(room.timerStatus!=="paused"||!room.timerPausedRemainingMs)return jsonError(409,"timer_not_paused","The shared timer is not paused.");await db.update(schema.studyRooms).set({timerStatus:"running",timerStartedAt:now,timerEndsAt:now+room.timerPausedRemainingMs,timerPausedRemainingMs:null,updatedAt:now}).where(and(eq(schema.studyRooms.id,id),eq(schema.studyRooms.timerStatus,"paused"))).run();return NextResponse.json({ok:true});
 }
 if(action==="reset"){
  const members=await roomMemberCount(id,now),elapsed=room.timerElapsedMs+(room.timerStatus==="running"&&room.timerStartedAt?Math.max(0,now-room.timerStartedAt):0);await db.transaction(async tx=>{if(room.timerRunId)await tx.update(schema.studyRoomSessions).set({endedAt:now,activeMilliseconds:elapsed,participantCount:members,completed:0}).where(and(eq(schema.studyRoomSessions.id,room.timerRunId),isNull(schema.studyRoomSessions.endedAt))).run();await tx.update(schema.studyRooms).set({timerStatus:"idle",timerPhase:"focus",timerStartedAt:null,timerEndsAt:null,timerPausedRemainingMs:null,timerElapsedMs:0,timerRunId:null,updatedAt:now}).where(eq(schema.studyRooms.id,id)).run();});return NextResponse.json({ok:true});
 }
 if(action==="break"){
  if(room.timerStatus!=="completed"||room.timerPhase!=="focus")return jsonError(409,"focus_not_complete","Finish focus before starting a break.");await db.update(schema.studyRooms).set({timerStatus:"running",timerPhase:"break",timerStartedAt:now,timerEndsAt:now+room.breakDurationMinutes*60_000,timerPausedRemainingMs:null,timerElapsedMs:0,updatedAt:now}).where(eq(schema.studyRooms.id,id)).run();return NextResponse.json({ok:true});
 }
 if(room.timerStatus!=="running"||!room.timerEndsAt||room.timerEndsAt>now)return jsonError(409,"timer_not_finished","The timer has not reached zero yet.");const members=await roomMemberCount(id,now),elapsed=room.timerElapsedMs+Math.max(0,now-(room.timerStartedAt??now));
 await db.transaction(async tx=>{await tx.update(schema.studyRooms).set({timerStatus:"completed",timerEndsAt:null,timerStartedAt:null,timerPausedRemainingMs:0,timerElapsedMs:elapsed,updatedAt:now}).where(and(eq(schema.studyRooms.id,id),eq(schema.studyRooms.timerStatus,"running"),lte(schema.studyRooms.timerEndsAt,now))).run();if(room.timerPhase==="focus"&&room.timerRunId)await tx.update(schema.studyRoomSessions).set({endedAt:now,activeMilliseconds:Math.min(room.timerDurationMinutes*60_000,elapsed),participantCount:members,completed:1}).where(and(eq(schema.studyRoomSessions.id,room.timerRunId),isNull(schema.studyRoomSessions.endedAt))).run();});return NextResponse.json({ok:true,completed:true});
}
