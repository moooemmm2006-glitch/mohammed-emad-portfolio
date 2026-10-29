import { notFound } from "next/navigation";
import { isLevel } from "@/lib/levels";
import { grammarLessons } from "@/lib/grammar/course";
import { GrammarLevelPage } from "@/components/GrammarCourse";
export default async function Page({params}:{params:Promise<{level:string}>}){const raw=(await params).level.toUpperCase();if(!isLevel(raw))notFound();return <GrammarLevelPage level={raw} lessons={grammarLessons(raw)}/>}
