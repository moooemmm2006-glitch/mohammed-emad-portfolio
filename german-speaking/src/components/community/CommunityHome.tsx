"use client";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { fill, type TKey } from "@/lib/client/i18n";
import type { Level } from "@/lib/levels";
type RoomCardData={id:string;name:string;description:string;visibility:"public"|"private";capacity:number;level:string;mode:string;goal:string;approvalRequired:boolean;status:string;timerStatus:string;timerPhase:string;host:{name:string;photo:string|null};participants:number;createdAt:number};
type Dashboard={preferences:{shareOnline:boolean};stats:{online:number;studying:number;rooms:number;publicAvailable:number};rooms:RoomCardData[];myRooms:RoomCardData[];onlinePeople:{id:string;name:string;photo:string|null;room:{id:string;name:string;level:string}|null}[]};
type FormData={name:string;description:string;visibility:"public"|"private";capacity:number;level:"general"|Level;mode:"silent"|"focus"|"practice"|"grammar"|"free";goal:string;durationMinutes:number;breakMinutes:number;approvalRequired:boolean};
const empty:FormData={name:"",description:"",visibility:"public",capacity:12,level:"general",mode:"focus",goal:"",durationMinutes:25,breakMinutes:5,approvalRequired:false};
// 👥 Community: a two-pane, chat-app-like layout. Start: the rooms list (my rooms on top, then open
// rooms, with search and a level filter); the main pane shows the selected room (?room=id) with one big
// "Join" button. Phones show one pane at a time (list → room, with a back arrow). Data and actions are
// the same as before: GET /api/community, create, join, invite link, "show me as available".
export function CommunityHome(){return <Suspense><CommunityHomeInner/></Suspense>}
function CommunityHomeInner(){
 const {t}=useUI(),router=useRouter(),params=useSearchParams();const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(false),[createOpen,setCreateOpen]=useState(false),[inviteOpen,setInviteOpen]=useState(false),[inviteText,setInviteText]=useState(""),[form,setForm]=useState(empty),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{try{setData(await api<Dashboard>("/api/community"));setError(false)}catch{setError(true)}},[]);
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),15000);return()=>window.clearInterval(timer)},[load]);
 const create=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setNotice("");try{const r=await api<{id:string;inviteToken:string|null}>("/api/community/rooms",{method:"POST",body:JSON.stringify(form)});setCreateOpen(false);router.push(`/community/rooms/${r.id}${r.inviteToken?`?invite=${r.inviteToken}`:""}`)}catch{setNotice(t("community_create_failed"))}finally{setBusy(false)}};
 const join=async(room:RoomCardData)=>{setBusy(true);setNotice("");try{await api(`/api/community/rooms/${room.id}/join`,{method:"POST",body:JSON.stringify({})});router.push(`/community/rooms/${room.id}`)}catch{setNotice(room.participants>=room.capacity?t("community_room_full"):t("community_load_failed"))}finally{setBusy(false)}};
 const setShare=async(shareOnline:boolean)=>{setData(d=>d?{...d,preferences:{shareOnline}}:d);try{await api("/api/community/preferences",{method:"PUT",body:JSON.stringify({shareOnline})})}catch{void load()}};
 const followInvite=(e:FormEvent)=>{e.preventDefault();const match=inviteText.trim().match(/(?:community\/invite\/)?([A-Za-z0-9_-]{40,60})\/?$/);if(!match){setNotice(t("community_invite_invalid"));return}router.push(`/community/invite/${encodeURIComponent(match[1])}`)};
 const selectedId=params.get("room");
 const [query,setQuery]=useState(""),[levelFilter,setLevelFilter]=useState<"all"|Level>("all");
 const allRooms=useMemo(()=>{if(!data)return [] as RoomCardData[];const seen=new Map<string,RoomCardData>();for(const r of [...data.myRooms,...data.rooms])if(!seen.has(r.id))seen.set(r.id,r);return [...seen.values()]},[data]);
 const matches=useCallback((r:RoomCardData)=>(levelFilter==="all"||r.level===levelFilter)&&(!query.trim()||`${r.name} ${r.description} ${r.host.name}`.toLowerCase().includes(query.trim().toLowerCase())),[levelFilter,query]);
 const myIds=useMemo(()=>new Set(data?.myRooms.map(r=>r.id)??[]),[data]);
 const mine=(data?.myRooms??[]).filter(matches),open=(data?.rooms??[]).filter(r=>!myIds.has(r.id)).filter(matches);
 const selected=allRooms.find(r=>r.id===selectedId)??null;
 // Phones: opening a room is a new screen (the back button returns to the list); wide screens just swap the pane.
 const select=(id:string|null)=>{const url=id?`/community?room=${encodeURIComponent(id)}`:"/community";if(window.matchMedia("(min-width: 768px)").matches)router.replace(url,{scroll:false});else router.push(url,{scroll:true})};
 const openCreate=()=>{setNotice("");setCreateOpen(true)},openInvite=()=>{setNotice("");setInviteText("");setInviteOpen(true)};
 return <main className="mx-auto max-w-7xl px-0 sm:px-4 pt-0 sm:pt-4 pb-4">
  {error&&<div role="alert" className="card mx-3 sm:mx-0 mb-3 p-4 flex items-center justify-between gap-3"><span>{t("community_load_failed")}</span><button className="btn btn-ghost" onClick={()=>void load()}>{t("community_retry")}</button></div>}
  {notice&&<p role="status" className="card mx-3 sm:mx-0 mb-3 px-4 py-3 text-sm">{notice}</p>}
  <div className="md:rounded-[1.25rem] md:border md:border-line md:bg-surface md:shadow-[var(--shadow)] md:overflow-hidden md:grid md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] md:h-[calc(100dvh-8.5rem)] md:min-h-[540px]">
   {/* ── Rooms list ── */}
   <aside className={`${selectedId?"hidden md:flex":"flex"} flex-col min-h-0 md:border-e border-line`} aria-label={t("community_nav")}>
    <div className="px-3 sm:px-4 pt-3 pb-2 space-y-3 border-b border-line">
     <div className="flex items-center justify-between gap-2">
      <div className="min-w-0"><h1 className="text-xl font-extrabold">{t("community_nav")}</h1>{data&&data.stats.studying>0&&<p className="text-xs text-muted mt-0.5 flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"/>{fill(t("community_studying_now"),{n:data.stats.studying})}</p>}</div>
      <div className="hidden md:flex items-center gap-1.5">
       <button type="button" className="btn btn-primary !min-h-[38px] !px-3 text-sm" onClick={openCreate}>＋ {t("community_create_room")}</button>
       <button type="button" className="btn btn-ghost !min-h-[38px] !px-3 text-sm" onClick={openInvite} aria-label={t("community_join_invite")} title={t("community_join_invite")}>🔗</button>
      </div>
      <button type="button" className="md:hidden btn btn-ghost !min-h-[40px] !px-3 text-sm" onClick={openInvite}>🔗 {t("community_invite_short")}</button>
     </div>
     <input type="search" className="field !py-2" placeholder={t("community_search")} aria-label={t("community_search")} value={query} onChange={e=>setQuery(e.target.value)}/>
     <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label={t("community_level")}>
      {(["all","A1","A2","B1","B2"] as const).map(l=><button key={l} type="button" aria-pressed={levelFilter===l} onClick={()=>setLevelFilter(l)} className={`shrink-0 rounded-full px-3 min-h-[34px] text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${levelFilter===l?"bg-emerald-600 text-white":"bg-surface-2 text-muted hover:text-ink"}`}>{l==="all"?t("community_all_levels"):l}</button>)}
     </div>
     {data&&<label className="flex items-center justify-between gap-3 text-xs text-muted cursor-pointer" title={t("community_share_status_help")}>
      <span>{t("community_share_status")}</span>
      <span className="relative inline-flex shrink-0"><input type="checkbox" role="switch" className="peer sr-only" checked={data.preferences.shareOnline} onChange={e=>void setShare(e.target.checked)}/><span aria-hidden="true" className="w-9 h-5 rounded-full bg-surface-2 border border-line transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500"/><span aria-hidden="true" className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4"/></span>
     </label>}
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 pb-24 md:pb-2" data-testid="rooms-list">
     {!data?<ul className="space-y-1" aria-hidden="true">{Array.from({length:6},(_,i)=><li key={i} className="flex items-center gap-3 px-2 py-2.5"><span className="w-10 h-10 rounded-full bg-surface-2 animate-pulse"/><span className="flex-1 space-y-2"><span className="block h-3 w-2/3 rounded bg-surface-2 animate-pulse"/><span className="block h-2.5 w-1/3 rounded bg-surface-2 animate-pulse"/></span></li>)}</ul>
     :allRooms.length===0?<div className="text-center px-4 py-10"><p className="text-3xl" aria-hidden="true">🫧</p><p className="mt-2 text-sm text-muted">{t("community_no_rooms")}</p><button type="button" className="btn btn-primary mt-4" onClick={openCreate}>{t("community_create_room")}</button></div>
     :mine.length+open.length===0?<p className="text-center text-sm text-muted px-4 py-10">{t("community_no_match")}</p>
     :<>
      {mine.length>0&&<RoomGroup title={t("community_my_rooms")} rooms={mine} selectedId={selectedId} onSelect={select} t={t}/>}
      {open.length>0&&<RoomGroup title={t("community_open_rooms")} rooms={open} selectedId={selectedId} onSelect={select} t={t}/>}
     </>}
    </div>
   </aside>
   {/* ── Selected room ── */}
   <section className={`${selectedId?"flex":"hidden md:flex"} flex-col min-h-0`} aria-live="polite">
    {selected&&data?<RoomDetails room={selected} own={myIds.has(selected.id)} people={data.onlinePeople.filter(p=>p.room?.id===selected.id)} busy={busy} onBack={()=>select(null)} onJoin={()=>void join(selected)} t={t}/>
    :selectedId&&!data?<div className="p-6 space-y-3" aria-hidden="true"><div className="h-6 w-1/2 rounded bg-surface-2 animate-pulse"/><div className="h-4 w-1/3 rounded bg-surface-2 animate-pulse"/><div className="h-24 rounded-2xl bg-surface-2 animate-pulse"/></div>
    :selectedId&&data?<div className="flex-1 grid place-items-center p-8 text-center"><div><p className="text-muted">{t("community_room_gone")}</p><button type="button" className="btn btn-ghost mt-4" onClick={()=>select(null)}>{t("community_back")}</button></div></div>
    :<div className="flex-1 grid place-items-center p-8 text-center"><div className="max-w-sm"><p className="text-4xl" aria-hidden="true">👥</p><h2 className="mt-3 text-xl font-bold">{t("community_title")}</h2><p className="mt-2 text-sm text-muted leading-relaxed">{t("community_pick_room")}</p><button type="button" className="btn btn-primary mt-5" onClick={openCreate}>＋ {t("community_create_room")}</button></div></div>}
   </section>
  </div>
  {/* Phones: create room as a floating button above the bottom bar. */}
  {!selectedId&&<button type="button" onClick={openCreate} aria-label={t("community_create_room")} className="md:hidden fixed bottom-24 end-4 z-30 grid place-items-center w-14 h-14 rounded-full bg-emerald-600 text-white text-3xl shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2">＋</button>}
  {inviteOpen&&<Modal onClose={()=>setInviteOpen(false)}><form onSubmit={followInvite} className="space-y-4"><h2 className="text-xl font-bold">{t("community_join_invite")}</h2><label className="block space-y-1.5"><span className="text-sm">{t("community_invite_title")}</span><input className="field" autoFocus value={inviteText} onChange={e=>setInviteText(e.target.value)}/></label><div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={()=>setInviteOpen(false)}>{t("community_cancel")}</button><button className="btn btn-primary">{t("community_join")}</button></div></form></Modal>}
  {createOpen&&<Modal onClose={()=>setCreateOpen(false)}><form onSubmit={create} className="space-y-4"><div><h2 className="text-2xl font-bold">{t("community_create_room")}</h2><p className="text-sm text-muted mt-1">{t("community_room_form_intro")}</p></div>
   <div className="grid sm:grid-cols-2 gap-3"><Field label={t("community_room_name")}><input className="field" minLength={3} maxLength={70} required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label={t("community_visibility")}><select className="field" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value as FormData["visibility"]})}><option value="public">{t("community_public")}</option><option value="private">{t("community_private")}</option></select></Field></div>
   <Field label={t("community_description")}><textarea className="field min-h-20" maxLength={300} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
   <div className="grid sm:grid-cols-3 gap-3"><Field label={t("community_level")}><select className="field" value={form.level} onChange={e=>setForm({...form,level:e.target.value as FormData["level"]})}><option value="general">{t("community_general_level")}</option>{(["A1","A2","B1","B2"] as const).map(x=><option key={x} value={x}>{x}</option>)}</select></Field><Field label={t("community_mode")}><select className="field" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value as FormData["mode"]})}>{(["silent","focus","practice","grammar","free"] as const).map(x=><option key={x} value={x}>{t(`community_mode_${x}` as TKey)}</option>)}</select></Field><Field label={t("community_capacity")}><input className="field" type="number" min={2} max={40} value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></Field></div>
   <Field label={t("community_goal")}><input className="field" maxLength={160} value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}/></Field>
   <div className="grid sm:grid-cols-2 gap-3"><Field label={t("community_duration")}><input className="field" type="number" min={5} max={180} value={form.durationMinutes} onChange={e=>setForm({...form,durationMinutes:Number(e.target.value)})}/></Field><Field label={t("community_break_duration")}><input className="field" type="number" min={1} max={30} value={form.breakMinutes} onChange={e=>setForm({...form,breakMinutes:Number(e.target.value)})}/></Field></div>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="accent-emerald-600 mt-1" checked={form.approvalRequired} onChange={e=>setForm({...form,approvalRequired:e.target.checked})}/><span>{t("community_approval")}</span></label><div className="rounded-xl bg-surface-2 p-3 text-xs text-muted">{t("community_media_note")}</div>{notice&&<p role="alert" className="text-danger text-sm">{notice}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={()=>setCreateOpen(false)}>{t("community_cancel")}</button><button className="btn btn-primary" disabled={busy}>{busy?t("loading"):t("community_create")}</button></div>
  </form></Modal>}
 </main>;
}
type T=(key:TKey)=>string;
function RoomGroup({title,rooms,selectedId,onSelect,t}:{title:string;rooms:RoomCardData[];selectedId:string|null;onSelect:(id:string)=>void;t:T}){
 return <section className="mb-2"><h2 className="px-2 pt-2 pb-1 text-[11px] font-bold tracking-wide text-muted uppercase">{title} <span className="tabular-nums">· {rooms.length}</span></h2><ul className="space-y-0.5">{rooms.map(r=><li key={r.id}><RoomRow room={r} active={r.id===selectedId} onClick={()=>onSelect(r.id)} t={t}/></li>)}</ul></section>;
}
function LevelBadge({level,t}:{level:string;t:T}){return <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">{level==="general"?t("community_general_level"):level}</span>}
function RoomRow({room,active,onClick,t}:{room:RoomCardData;active:boolean;onClick:()=>void;t:T}){
 const live=room.participants>0;
 return <button type="button" onClick={onClick} aria-current={active?"true":undefined} className={`w-full flex items-center gap-3 rounded-xl px-2 py-2 min-h-[56px] text-start transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500 ${active?"bg-emerald-500/10":"hover:bg-surface-2"}`}>
  <span className="relative shrink-0"><Avatar name={room.host.name} photo={room.host.photo}/>{live&&<span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" aria-label={t("community_room_active")}/>}</span>
  <span className="min-w-0 flex-1">
   <span className="flex items-center gap-1.5"><span className="font-semibold truncate" dir="auto">{room.name}</span>{room.visibility==="private"&&<span aria-label={t("community_private")} className="text-xs">🔒</span>}</span>
   <span className="flex items-center gap-1.5 text-xs text-muted mt-0.5"><LevelBadge level={room.level} t={t}/><span className="truncate">{t(`community_mode_${room.mode}` as TKey)}</span></span>
  </span>
  <span className="shrink-0 text-xs text-muted tabular-nums" aria-label={`${room.participants}/${room.capacity} ${t("community_participant_count")}`}>👥 {room.participants}/{room.capacity}</span>
 </button>;
}
function RoomDetails({room,own,people,busy,onBack,onJoin,t}:{room:RoomCardData;own:boolean;people:Dashboard["onlinePeople"];busy:boolean;onBack:()=>void;onJoin:()=>void;t:T}){
 const full=!own&&room.participants>=room.capacity,others=Math.max(0,room.participants-people.length);
 return <div className="flex-1 min-h-0 overflow-y-auto">
  <div className="sticky top-0 z-10 flex items-center gap-2 px-3 sm:px-5 py-2.5 border-b border-line bg-surface/95 backdrop-blur">
   <button type="button" onClick={onBack} className="md:hidden grid place-items-center w-10 h-10 rounded-full hover:bg-surface-2 text-xl rtl:rotate-180" aria-label={t("community_back")}>←</button>
   <h2 className="font-bold truncate flex-1" dir="auto">{room.name}</h2>
   {room.participants>0&&<span className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><i className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"/>{t("community_room_active")}</span>}
  </div>
  <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
   <div className="flex items-center gap-3"><Avatar name={room.host.name} photo={room.host.photo}/><div className="min-w-0"><p className="text-xs text-muted">{t("community_host")}</p><p className="font-semibold truncate" dir="auto">{room.host.name}</p></div></div>
   <div className="flex flex-wrap gap-1.5 text-xs">
    <span className="rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 font-bold">{room.level==="general"?t("community_general_level"):room.level}</span>
    <span className="rounded-full bg-surface-2 px-2.5 py-1">{t(`community_mode_${room.mode}` as TKey)}</span>
    <span className="rounded-full bg-surface-2 px-2.5 py-1">{room.visibility==="private"?`🔒 ${t("community_private")}`:`🌐 ${t("community_public")}`}</span>
    {room.approvalRequired&&<span className="rounded-full bg-surface-2 px-2.5 py-1">{t("community_approval_on")}</span>}
    <span className="rounded-full bg-surface-2 px-2.5 py-1">⏱ {room.timerStatus==="running"?t("community_timer_focus"):t("community_timer_idle")}</span>
   </div>
   {room.description&&<p className="leading-relaxed whitespace-pre-wrap break-words" dir="auto">{room.description}</p>}
   {room.goal&&<div className="rounded-2xl bg-surface-2 px-4 py-3"><p className="text-xs text-muted">{t("community_goal")}</p><p className="mt-0.5 font-medium break-words" dir="auto">{room.goal}</p></div>}
   <div>
    <h3 className="text-sm font-bold">{t("community_members")} <span className="text-muted font-normal tabular-nums">· {room.participants}/{room.capacity}</span></h3>
    {room.participants===0?<p className="mt-2 text-sm text-muted">{t("community_room_empty")}</p>:<ul className="mt-2 space-y-1.5">
     {people.map(p=><li key={p.id} className="flex items-center gap-2.5"><span className="relative"><Avatar name={p.name} photo={p.photo}/><span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" aria-hidden="true"/></span><span className="truncate" dir="auto">{p.name}</span></li>)}
     {others>0&&<li className="text-sm text-muted">{fill(t(people.length?"community_more_people":"community_people_inside"),{n:others})}</li>}
    </ul>}
   </div>
   <button type="button" className="btn btn-primary w-full !min-h-[52px] text-lg" disabled={busy||full} onClick={onJoin}>{busy?t("loading"):own?t("community_open"):full?t("community_room_full"):t("community_join")}</button>
  </div>
 </div>;
}
function Avatar({name,photo}:{name:string;photo:string|null}){return photo?<Image src={photo} alt="" width={40} height={40} unoptimized className="w-10 h-10 rounded-full object-cover shrink-0"/>:<span className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-800 dark:text-emerald-200 grid place-items-center font-bold shrink-0">{name.trim().slice(0,1)||"?"}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5"><span className="text-sm font-semibold">{label}</span>{children}</label>}
function Modal({children,onClose}:{children:React.ReactNode;onClose:()=>void}){return <div className="fixed inset-0 z-50 bg-black/55 p-3 sm:p-6 grid place-items-center" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="card w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-7" role="dialog" aria-modal="true">{children}</div></div>}
