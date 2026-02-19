
import { prisma } from '../src/lib/prisma'

async function main() {
    const locIdPartial = '698583e7'
    // Fetch all and filter in memory to avoid Prisma ObjectID validation error on partial ID
    const allLocations = await prisma.pOSLocation.findMany({
        select: {
            id: {},
            name: true,
            type: true
        }
    })

    const matches = allLocations.filter(l => l.id.includes(locIdPartial))
    console.log('Found locations:', matches)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
