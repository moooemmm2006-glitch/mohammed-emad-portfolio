import { and, asc, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { liveRoomMembers, publicRoom } from "@/lib/community/service";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params;const db=await getDb();const room=await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id,id)).get();if(!room)return jsonError(404,"not_found","Room not found.");
 const membership=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).get();
 if(room.visibility==="private"&&!membership)return jsonError(404,"not_found","Room not found.");
 if(membership?.status==="pending")return NextResponse.json({access:"pending",room:publicRoom(room)},{status:202});
 if(room.status==="active"&&membership?.status==="active")await db.update(schema.studyRoomMembers).set({lastSeenAt:Date.now()}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).run();
 const host=await db.select({name:schema.users.name,username:schema.users.username,photo:schema.users.photo}).from(schema.users).where(eq(schema.users.id,room.hostUserId)).get();
 const members=room.status==="active"?await liveRoomMembers(id):[];
 const requests=user.id===room.hostUserId?await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.status,"pending"))).orderBy(asc(schema.studyRoomMembers.joinedAt)).all():[];
 const requestIds=[...new Set(requests.map(x=>x.userId))],requestUsers=requestIds.length?await db.select({id:schema.users.id,name:schema.users.name,username:schema.users.username,photo:schema.users.photo}).from(schema.users).where(inArray(schema.users.id,requestIds)).all():[];
 const userMap=new Map(requestUsers.map(x=>[x.id,x]));const session=room.timerRunId?await db.select().from(schema.studyRoomSessions).where(eq(schema.studyRoomSessions.id,room.timerRunId)).get():undefined;
 const now=Date.now(),remaining=room.timerStatus==="running"&&room.timerEndsAt?Math.max(0,room.timerEndsAt-now):room.timerStatus==="paused"?(room.timerPausedRemainingMs??0):0;
 if(room.timerStatus==="running"&&room.timerEndsAt&&remaining===0){const elapsed=room.timerElapsedMs+Math.max(0,now-(room.timerStartedAt??now));await db.update(schema.studyRooms).set({timerStatus:"completed",timerElapsedMs:elapsed,timerEndsAt:null,timerPausedRemainingMs:0,updatedAt:now}).where(and(eq(schema.studyRooms.id,id),eq(schema.studyRooms.timerStatus,"running"),lte(schema.studyRooms.timerEndsAt,now))).run();if(room.timerPhase==="focus"&&room.timerRunId)await db.update(schema.studyRoomSessions).set({endedAt:now,activeMilliseconds:Math.min(room.timerDurationMinutes*60_000,elapsed),participantCount:members.length,completed:1}).where(and(eq(schema.studyRoomSessions.id,room.timerRunId),isNull(schema.studyRoomSessions.endedAt))).run();}
 let messages:{id:number;body:string;createdAt:number;user:{id:string;name:string;photo:string|null}}[]=[];let next=0;
 if(membership?.status==="active"){
  const raw=new URL(req.url).searchParams.get("after"),after=raw&&/^\d+$/.test(raw)?Number(raw):0;
  const messageRows=after?await db.select().from(schema.studyRoomMessages).where(and(eq(schema.studyRoomMessages.roomId,id),gt(schema.studyRoomMessages.id,after))).orderBy(asc(schema.studyRoomMessages.id)).limit(80).all():await db.select().from(schema.studyRoomMessages).where(eq(schema.studyRoomMessages.roomId,id)).orderBy(desc(schema.studyRoomMessages.id)).limit(50).all().then(x=>x.reverse());
  const userIds=[...new Set(messageRows.map(m=>m.userId))],messageUsers=userIds.length?await db.select({id:schema.users.id,name:schema.users.name,username:schema.users.username,photo:schema.users.photo}).from(schema.users).where(inArray(schema.users.id,userIds)).all():[];const names=new Map(messageUsers.map(x=>[x.id,x]));
  messages=messageRows.map(m=>({id:m.id,body:m.body,createdAt:m.createdAt,user:{id:m.userId,name:names.get(m.userId)?.name||names.get(m.userId)?.username||"Student",photo:names.get(m.userId)?.photo??null}}));next=messages.at(-1)?.id??after;
 }
 return NextResponse.json({access:membership?.status==="active"?"member":"not_member",isHost:user.id===room.hostUserId,room:{...publicRoom(room,host,members.length),timerStatus:room.timerStatus==="running"&&remaining===0?"completed":room.timerStatus,timerPhase:room.timerPhase,timerEndsAt:room.timerEndsAt,timerStartedAt:room.timerStartedAt,timerPausedRemainingMs:room.timerPausedRemainingMs,timerElapsedMs:room.timerElapsedMs,timerDurationMinutes:room.timerDurationMinutes,breakDurationMinutes:room.breakDurationMinutes,timerRunId:room.timerRunId},members,requests:requests.map(r=>({user:userMap.get(r.userId),joinedAt:r.joinedAt})).filter(x=>x.user),session:session??null,messages,next,now});
}
