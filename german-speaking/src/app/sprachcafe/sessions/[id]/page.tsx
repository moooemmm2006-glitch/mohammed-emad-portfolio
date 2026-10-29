import { CafeSessionPage } from "@/components/sprachcafe/CafeDetails";
export default async function SessionDetailsPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CafeSessionPage id={id}/>}
