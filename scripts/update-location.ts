
import { prisma } from '../src/lib/prisma'

async function main() {
    const locIdPartial = '698583e7'
    // Fetch to find full ID
    const allLocations = await prisma.pOSLocation.findMany({
        select: { id: true, name: true, type: true }
    })

    const match = allLocations.find(l => l.id.includes(locIdPartial))

    if (match) {
        console.log('Found location:', match)
        const updated = await prisma.pOSLocation.update({
            where: { id: match.id },
            data: { type: 'NON_DAIRY' }
        })
        console.log('Updated location:', updated)
    } else {
        console.log('Location not found')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
