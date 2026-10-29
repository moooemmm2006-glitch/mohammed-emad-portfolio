import { notFound } from "next/navigation";
import { isLevel } from "@/lib/levels";
import { grammarLesson, grammarLessonById, grammarLessons } from "@/lib/grammar/course";
import { GrammarLessonPage } from "@/components/GrammarCourse";
export default async function Page({params}:{params:Promise<{level:string;lesson:string}>}){const p=await params,raw=p.level.toUpperCase();if(!isLevel(raw))notFound();const lessons=grammarLessons(raw),lesson=grammarLesson(raw,p.lesson);if(!lesson)notFound();const index=lessons.findIndex(l=>l.id===lesson.id);const related=lesson.related.map((id:string)=>grammarLessonById(id)).filter((x):x is NonNullable<typeof x>=>Boolean(x));return <GrammarLessonPage level={raw} lesson={lesson} previous={lessons[index-1]} next={lessons[index+1]} related={related}/>}
