import { fail, ok, guardApiAbuse } from "@/lib/api"; import { prisma } from "@/lib/prisma"; export async function GET(request: Request){try{
    await guardApiAbuse(request, "interests:get", 60, 60000);return ok({interests:await prisma.interest.findMany({orderBy:{name:"asc"}})})}catch(e){return fail(e)}}
