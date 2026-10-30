import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { roomMemberCount } from "@/lib/community/service";
import { leaveVoice } from "@/lib/community/voice";
export const runtime="nodejs";export const dynamic="force-dynamic";
const Body=z.discriminatedUnion("action",[
 z.object({action:z.literal("raise")}),z.object({action:z.literal("lower"),userId:z.string().optional()}),
 z.object({action:z.literal("approve"),userId:z.string()}),z.object({action:z.literal("reject"),userId:z.string()}),
 z.object({action:z.literal("remove"),userId:z.string()}),z.object({action:z.literal("transfer"),userId:z.string()}),
]);
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return unauthorized();const {id}=await params,parsed=Body.safeParse(await readJson(req));if(!parsed.success)return jsonError(400,"invalid_body","Invalid participant action.");
 const db=await getDb(),room=await db.select().from(schema.studyRooms).where(eq(schema.studyRooms.id,id)).get(),own=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).get();
 if(!room||room.status!=="active"||own?.status!=="active")return jsonError(404,"not_found","Room not found.");const {action}=parsed.data,host=room.hostUserId===user.id,now=Date.now();
 if(action==="raise"||action==="lower"){
  const target=parsed.data.action==="lower"?parsed.data.userId??user.id:user.id;if(target!==user.id&&!host)return jsonError(403,"host_only","Only the host may lower another participant's hand.");
  await db.update(schema.studyRoomMembers).set({handRaisedAt:action==="raise"?now:null}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,target),eq(schema.studyRoomMembers.status,"active"))).run();return NextResponse.json({ok:true});
 }
 if(!host)return jsonError(403,"host_only","Only the host can manage participants.");const target=parsed.data.userId;if(target===user.id)return jsonError(400,"invalid_target","This action cannot target the host.");
 const targetMember=await db.select().from(schema.studyRoomMembers).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,target))).get();
 if(action==="approve"){
  if(targetMember?.status!=="pending")return jsonError(404,"request_not_found","Join request not found.");if(await roomMemberCount(id,now)>=room.capacity)return jsonError(409,"room_full","The room has reached its participant limit.");
  await db.update(schema.studyRoomMembers).set({status:"active",role:"member",joinedAt:now,lastSeenAt:now}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,target),eq(schema.studyRoomMembers.status,"pending"))).run();return NextResponse.json({ok:true});
 }
 if(action==="reject"){
  if(targetMember?.status!=="pending")return jsonError(404,"request_not_found","Join request not found.");await db.update(schema.studyRoomMembers).set({status:"rejected"}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,target))).run();return NextResponse.json({ok:true});
 }
 if(action==="remove"){
  if(targetMember?.status!=="active")return jsonError(404,"participant_not_found","Participant not found.");await db.update(schema.studyRoomMembers).set({status:"left",handRaisedAt:null}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,target))).run();await leaveVoice(id,target);return NextResponse.json({ok:true});
 }
 if(targetMember?.status!=="active")return jsonError(404,"participant_not_found","Participant not found.");
 await db.transaction(async tx=>{await tx.update(schema.studyRoomMembers).set({role:"member"}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,user.id))).run();await tx.update(schema.studyRoomMembers).set({role:"host"}).where(and(eq(schema.studyRoomMembers.roomId,id),eq(schema.studyRoomMembers.userId,target))).run();await tx.update(schema.studyRooms).set({hostUserId:target,updatedAt:now}).where(eq(schema.studyRooms.id,id)).run();});return NextResponse.json({ok:true});
}
