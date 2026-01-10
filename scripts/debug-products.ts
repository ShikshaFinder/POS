import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging POS Products ---')

    // 1. List all users and their default orgs
    const users = await prisma.user.findMany({
        include: {
            defaultOrganization: true,
            memberships: {
                include: { organization: true }
            }
        },
        take: 5
    })

    console.log(`Found ${users.length} users`)

    for (const user of users) {
        console.log(`\nUser: ${user.email}`)

        // Logic from auth.ts
        const currentOrgId = user.defaultOrganizationId || user.memberships[0]?.organizationId

        if (!currentOrgId) {
            console.log('  -> No Organization ID found (No default, no memberships)')
            continue
        }

        const org = user.defaultOrganization || user.memberships.find(m => m.organizationId === currentOrgId)?.organization
        console.log(`  -> Effective Org ID: ${currentOrgId} (${org?.name})`)

        // Query Products
        const productCount = await prisma.product.count({
            where: { organizationId: currentOrgId }
        })

        console.log(`  -> Total Products in DB for this Org: ${productCount}`)

        // Check Published vs Unpublished
        const publishedCount = await prisma.product.count({
            where: { organizationId: currentOrgId, isPublished: true }
        })
        console.log(`  -> Published Products: ${publishedCount}`)

        // Check Stock > 0 (Though API doesn't filter this yet)
        const inStockCount = await prisma.product.count({
            where: { organizationId: currentOrgId, currentStock: { gt: 0 } }
        })
        console.log(`  -> In-Stock Products: ${inStockCount}`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
