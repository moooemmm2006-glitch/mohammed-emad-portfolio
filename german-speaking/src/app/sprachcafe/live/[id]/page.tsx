import { CafeWaitingRoom } from "@/components/sprachcafe/CafeDetails";
export default async function LiveSessionPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CafeWaitingRoom id={id}/>}
