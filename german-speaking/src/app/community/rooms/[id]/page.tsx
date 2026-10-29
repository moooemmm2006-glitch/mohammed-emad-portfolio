"use client";
import { Suspense } from "react";
import { CommunityRoom } from "@/components/community/CommunityRoom";
export default function RoomPage(){return <Suspense fallback={<div className="mx-auto max-w-5xl p-6"><div className="card h-48 animate-pulse"/></div>}><CommunityRoom/></Suspense>}
