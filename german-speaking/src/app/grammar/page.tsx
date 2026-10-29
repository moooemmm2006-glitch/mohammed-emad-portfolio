import { GrammarHome } from "@/components/GrammarCourse";
import { grammarLessonCounts } from "@/lib/grammar/course";
export default function Page(){return <GrammarHome counts={grammarLessonCounts()}/>}
