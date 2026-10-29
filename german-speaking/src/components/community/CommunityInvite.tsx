"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
type Preview={room:{id:string;name:string;description:string;host:{name:string;photo:string|null};participants:number;capacity:number;level:string;mode:string}};
export function CommunityInvite({token}:{token:string}){
 const {t}=useUI(),router=useRouter();const [data,setData]=useState<Preview|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;api<Preview>(`/api/community/invites/${encodeURIComponent(token)}`).then(x=>{if(alive)setData(x)}).catch(()=>{if(alive)setError(true)});return()=>{alive=false}},[token]);
 const join=async()=>{if(!data)return;setBusy(true);try{await api(`/api/community/rooms/${data.room.id}/join`,{method:"POST",body:JSON.stringify({inviteToken:token})});router.push(`/community/rooms/${data.room.id}?invite=${encodeURIComponent(token)}`)}catch{setError(true)}finally{setBusy(false)}};
 return <main className="mx-auto max-w-2xl px-4 py-10"><div className="card p-6 sm:p-9 text-center">{error?<><div className="text-4xl">🔗</div><h1 className="text-2xl font-bold mt-3">{t("community_invite_invalid")}</h1></>:!data?<div className="animate-pulse text-muted">{t("loading")}</div>:<><div className="text-4xl">🔐</div><p className="text-xs font-bold text-muted mt-4">{t("community_private")}</p><h1 className="text-2xl font-bold mt-2">{data.room.name}</h1><p className="text-sm text-muted mt-2">{data.room.description}</p><p className="text-sm mt-4">{t("community_host")}: {data.room.host.name} · {data.room.participants}/{data.room.capacity} {t("community_participant_count")}</p><button className="btn btn-primary mt-6" onClick={()=>void join()} disabled={busy}>{busy?t("loading"):t("community_join")}</button></>}</div></main>
}
