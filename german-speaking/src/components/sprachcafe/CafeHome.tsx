"use client";
import { IconSprachcafe } from "@/components/Icons";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { cafeText, categoryText } from "@/lib/sprachcafe/labels";
import type { TKey, UILang } from "@/lib/client/i18n";
import { RatingBadge } from "./CafeReviews";

export type CafeTeacher = { rating?:{average:number|null;count:number}; id:string;displayNameAr:string;displayNameEn:string|null;photoUrl:string|null;biography:string;languages:string[];proficiency:string|null;specializations:string[];levels:string[];sessionTypes:string[];availability:string[];durationMinutes:number|null;priceMinor:number|null;currency:string|null;bookingEnabled:boolean;published:boolean;upcomingSessions:number };
export type CafeSession = {id:string;title:string;description:string;teacher:{id:string;name:string;photoUrl:string|null;bookingEnabled:boolean};level:string;category:string;startsAt:number;timezone:string;durationMinutes:number;capacity:number;bookingCount:number;isFree:boolean;priceMinor:number|null;currency:string|null;bookingDeadlineAt:number;cancellationDeadlineAt:number;joinOpensAt:number;status:string;cancellationNote:string|null;bookingAvailable:boolean};
type Directory={teachers:CafeTeacher[];sessions:CafeSession[];featured:CafeSession|null;paymentsEnabled:boolean;liveMediaEnabled:boolean};
const categories=["conversation","speaking","pronunciation","vocabulary","grammar","exam","open"];

export function CafeHome(){
 const {lang,t}=useUI();const [data,setData]=useState<Directory|null>(null),[error,setError]=useState(false),[level,setLevel]=useState(""),[teacher,setTeacher]=useState(""),[category,setCategory]=useState(""),[free,setFree]=useState(false),[search,setSearch]=useState(""),[fromDate,setFromDate]=useState(""),[toDate,setToDate]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{try{setData(await api<Directory>("/api/sprachcafe"));setError(false)}catch{setError(true)}},[]);
 useEffect(()=>{void load()},[load]);
  const filtered=useMemo(()=>data?.sessions.filter(s=>{const date=sessionDateKey(s.startsAt,s.timezone);return(!level||s.level===level)&&(!teacher||s.teacher.id===teacher)&&(!category||s.category===category)&&(!free||s.isFree)&&(!fromDate||date>=fromDate)&&(!toDate||date<=toDate)&&(!search||`${s.title} ${s.description} ${s.teacher.name}`.toLowerCase().includes(search.toLowerCase()))})??[],[data,level,teacher,category,free,fromDate,toDate,search]);
 const book=async(id:string)=>{setNotice("");try{await api("/api/sprachcafe/bookings",{method:"POST",body:JSON.stringify({sessionId:id})});setNotice(cafeText(t,"book_success"));await load()}catch(e){setNotice(bookingError(e,t))}};
 if(!data&&!error)return <main className="mx-auto max-w-[1440px] px-4 sm:px-7 xl:px-10 py-8"><div className="card h-48 animate-pulse bg-surface-2"/></main>;
 const moreFilters=[teacher,category,fromDate,toDate].filter(Boolean).length+(free?1:0);
 return <main className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 sm:py-10 space-y-10" data-testid="cafe-home">
  {/* ── Hero: what it is + how to book in three steps ── */}
  <header className="relative overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-surface via-surface to-amber-500/10 p-6 sm:p-10">
   <div className="absolute -end-10 -top-24 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" aria-hidden="true"/>
   <div className="relative">
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-700 dark:text-amber-300"><IconSprachcafe size={16} />Sprachcafé</span>
    <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">{cafeText(t,"title")}</h1>
    <p className="mt-3 max-w-3xl text-lg leading-8 text-muted">{cafeText(t,"intro")}</p>
    <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={cafeText(t,"how_title")}>
     {(["step1","step2","step3"] as const).map((k,i)=><li key={k} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/80 p-3.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-lg font-black text-slate-950">{i+1}</span><span className="text-sm font-semibold leading-snug">{cafeText(t,k)}</span></li>)}
    </ol>
    <div className="mt-6 flex flex-wrap gap-3"><a className="btn btn-primary" href="#sessions">{cafeText(t,"browse")}</a><Link className="btn btn-ghost" href="/sprachcafe/bookings">{cafeText(t,"my_bookings")}</Link><a className="btn btn-ghost" href="#teachers">{cafeText(t,"teachers")}</a></div>
    <p className="mt-4 text-xs text-muted">{cafeText(t,"media_note")}</p>
   </div>
  </header>
  {notice&&<p role="status" className="card border border-emerald-500/30 px-4 py-3">{notice}</p>}
  {error&&<div role="alert" className="card p-5 flex items-center justify-between gap-3"><span>{cafeText(t,"error")}</span><button className="btn btn-ghost" onClick={()=>void load()}>{cafeText(t,"retry")}</button></div>}
  {data?.featured&&<section aria-labelledby="featured-title"><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-bold text-amber-700 dark:text-amber-300">{cafeText(t,"featured")}</p><h2 id="featured-title" className="mt-1 text-2xl font-extrabold">{data.featured.title}</h2></div><Link href={`/sprachcafe/sessions/${data.featured.id}`} className="text-sm font-bold text-accent hover:underline">{cafeText(t,"details")} →</Link></div><SessionCard session={data.featured} lang={lang} onBook={()=>void book(data.featured!.id)}/></section>}
  {/* ── Sessions first: that's what people come for ── */}
  <section id="sessions" className="scroll-mt-24 space-y-4">
   <div className="flex flex-wrap items-end justify-between gap-4"><SectionHead title={cafeText(t,"upcoming_title")} subtitle={cafeText(t,"upcoming_sub")}/>{data && data.sessions.length > 0 &&<span className="rounded-full bg-surface-2 px-3 py-1.5 text-sm tabular-nums">{filtered.length}</span>}</div>
   <div className="card p-3 sm:p-4 space-y-3">
    <div className="flex flex-col sm:flex-row gap-3">
     <label className="flex-1"><span className="sr-only">{cafeText(t,"search")}</span><input type="search" className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder={`⌕ ${cafeText(t,"search")}`}/></label>
     <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label={cafeText(t,"level")}>
      {["","A1","A2","B1","B2"].map(x=><button key={x||"all"} type="button" aria-pressed={level===x} onClick={()=>setLevel(x)} className={`shrink-0 rounded-full px-4 min-h-[44px] text-sm font-bold transition ${level===x?"bg-amber-500 text-slate-950":"bg-surface-2 text-muted hover:text-ink"}`}>{x||cafeText(t,"all")}</button>)}
     </div>
    </div>
    <details className="group" open={moreFilters>0}>
     <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted hover:text-ink min-h-[36px] [&::-webkit-details-marker]:hidden">{cafeText(t,"more_filters")}{moreFilters>0&&<span className="rounded-full bg-amber-500 px-2 text-xs font-bold text-slate-950">{moreFilters}</span>}<span className="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span></summary>
     <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <select className="field" aria-label={cafeText(t,"teacher")} value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">{cafeText(t,"teacher")} · {cafeText(t,"all")}</option>{data?.teachers.map(t=><option key={t.id} value={t.id}>{teacherName(t,lang)}</option>)}</select>
      <select className="field" aria-label={cafeText(t,"category")} value={category} onChange={e=>setCategory(e.target.value)}><option value="">{cafeText(t,"category")} · {cafeText(t,"all")}</option>{categories.map(x=><option key={x} value={x}>{categoryText(t,x)}</option>)}</select>
      <label><span className="text-xs text-muted">{cafeText(t,"from_date")}</span><input className="field" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label>
      <label><span className="text-xs text-muted">{cafeText(t,"to_date")}</span><input className="field" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label>
      <label className="sm:col-span-2 xl:col-span-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600 w-5 h-5" checked={free} onChange={e=>setFree(e.target.checked)}/>{cafeText(t,"free_only")}</label>
     </div>
    </details>
   </div>
   {filtered.length?<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-5">{filtered.map(s=><SessionCard key={s.id} session={s} lang={lang} onBook={()=>void book(s.id)}/>)}</div>:<Empty message={cafeText(t,"no_sessions")}/>}
  </section>
  {/* ── The teachers ── */}
  <section id="teachers" className="scroll-mt-24"><SectionHead title={cafeText(t,"teachers")} subtitle={cafeText(t,"empty_action")}/>{data?.teachers.length?<div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-5">{data.teachers.map(t=><TeacherCard key={t.id} teacher={t} lang={lang}/>)}</div>:<Empty message={cafeText(t,"no_teachers")}/>}</section>
 </main>
}

export function TeacherCard({teacher,lang}:{teacher:CafeTeacher;lang:UILang}){const {t}=useUI();return <article className="group overflow-hidden rounded-3xl border border-line bg-surface transition hover:border-amber-500/40 hover:shadow-xl"><div className="flex min-h-44 items-center justify-center bg-gradient-to-br from-surface-2 to-amber-500/10 p-6">{teacher.photoUrl?<Image src={teacher.photoUrl} alt="" width={112} height={112} unoptimized className="h-28 w-28 rounded-full object-cover ring-4 ring-surface"/>:<span aria-hidden="true" className="grid h-28 w-28 place-items-center rounded-full border border-line bg-surface/80 text-4xl font-extrabold text-amber-700 dark:text-amber-300">{teacherInitial(teacher.displayNameAr)}</span>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold">{teacherName(teacher,lang)}</h3>{teacher.levels.length>0&&<p className="mt-1 text-sm text-muted">{teacher.levels.join(" · ")}</p>}</div><RatingBadge rating={teacher.rating}/>{teacher.upcomingSessions>0&&<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300">{teacher.upcomingSessions} {cafeText(t,"sessions")}</span>}</div>{teacher.biography&&<p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{teacher.biography}</p>}<div className="mt-5 flex flex-wrap gap-2"><Link className="btn btn-ghost flex-1" href={`/sprachcafe/teachers/${teacher.id}`}>{cafeText(t,"view_profile")}</Link>{teacher.bookingEnabled&&teacher.upcomingSessions>0&&<Link className="btn btn-primary flex-1" href={`/sprachcafe/teachers/${teacher.id}#sessions`}>{cafeText(t,"book_session")}</Link>}</div></div></article>}

export function SessionCard({session,lang,onBook}:{session:CafeSession;lang:UILang;onBook?:()=>void}){const {t}=useUI();const date=new Date(session.startsAt),dateText=date.toLocaleString(lang==="ar"?"ar-EG":lang==="de"?"de-DE":"en-GB",{timeZone:session.timezone,dateStyle:"medium",timeStyle:"short"});const seats=Math.max(0,session.capacity-session.bookingCount);return <article className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 transition hover:border-amber-500/40 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">{session.level}</span><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">{categoryText(t,session.category)}</span></div><h3 className="mt-3 text-lg font-extrabold leading-7">{session.title}</h3></div><span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs">{session.isFree?cafeText(t,"free"):cafeText(t,"paid")}</span></div><p className="mt-2 text-sm leading-6 text-muted">{session.description}</p><p className="mt-4 text-sm font-semibold">{session.teacher.name}</p><div className="mt-4 space-y-2 text-sm text-muted"><p>📅 {dateText} · {session.timezone}</p><p>⏱ {session.durationMinutes} {cafeText(t,"minutes")}</p><p>👥 {session.bookingCount}/{session.capacity} · {seats>0?`${seats} ${cafeText(t,"seats")}`:cafeText(t,"full")}</p>{!session.isFree&&session.priceMinor!==null&&<p>💳 {(session.priceMinor/100).toFixed(2)} {session.currency}</p>}</div><div className="mt-auto flex gap-2 pt-5"><Link className="btn btn-ghost flex-1" href={`/sprachcafe/sessions/${session.id}`}>{cafeText(t,"details")}</Link>{session.bookingAvailable&&seats>0&&onBook?<button className="btn btn-primary flex-1" onClick={onBook}>{cafeText(t,"book_session")}</button>:!session.bookingAvailable?<span className="flex-1 self-center text-center text-xs text-muted">{!session.isFree?cafeText(t,"paid_unavailable"):cafeText(t,"booking_disabled")}</span>:null}</div></article>}

export function SectionHead({title,subtitle}:{title:string;subtitle:string}){return <div><h2 className="text-2xl sm:text-3xl font-extrabold">{title}</h2><p className="mt-1 text-sm text-muted">{subtitle}</p></div>}
export function Empty({message}:{message:string}){return <div className="mt-5 rounded-3xl border border-dashed border-line bg-surface/50 p-8 text-center"><span className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><IconSprachcafe size={30} /></span><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted">{message}</p></div>}
/** The first letter of the teacher's name, skipping a title (Herr / Frau / Dr.). */
export function teacherInitial(name:string){const parts=name.trim().split(/\s+/);const rest=parts.length>1&&/^(herr|frau|dr\.?)$/i.test(parts[0])?parts.slice(1):parts;return (rest[0]??"?").slice(0,1).toUpperCase()}
export function teacherName(t:CafeTeacher,lang:UILang){return lang==="en"?(t.displayNameEn||t.displayNameAr):t.displayNameAr}
export function bookingError(error:unknown,t:(key:TKey)=>string){if(error instanceof ApiError){const keyMap:Partial<Record<string,TKey>>={already_booked:"cafe_already_booked",session_full:"cafe_session_full",booking_closed:"cafe_booking_closed",payment_unavailable:"cafe_payment_unavailable",booking_disabled:"cafe_booking_disabled"};const key=keyMap[error.code];if(key)return t(key)}return t("cafe_error")}
function sessionDateKey(epoch:number,timezone:string){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(epoch),pick=(key:string)=>parts.find(p=>p.type===key)?.value??"00";return `${pick("year")}-${pick("month")}-${pick("day")}`}
