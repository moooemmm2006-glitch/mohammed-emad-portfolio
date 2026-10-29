import { CafeTeacherPage } from "@/components/sprachcafe/CafeDetails";
export default async function TeacherProfilePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CafeTeacherPage id={id}/>}
