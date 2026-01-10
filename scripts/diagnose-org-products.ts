import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Diagnostic: Orgs & Products ---')

    // 1. Find Orgs with Catalog Enabled (The ones user likely views)
    const catalogOrgs = await prisma.organization.findMany({
        where: { catalogEnabled: true },
        select: { id: true, name: true, slug: true }
    })

    console.log(`\nFound ${catalogOrgs.length} Catalog-Enabled Orgs:`)
    for (const org of catalogOrgs) {
        const count = await prisma.product.count({ where: { organizationId: org.id } })
        console.log(`[${org.name}] (Slug: ${org.slug}) -> Products: ${count} (ID: ${org.id})`)
    }

    // 2. Check the User 'janih' (guessing partial email match)
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'jani' } },
        include: {
            defaultOrganization: true,
            memberships: { include: { organization: true } }
        }
    })

    if (user) {
        console.log(`\nUser: ${user.email}`)
        console.log(`Default Org ID: ${user.defaultOrganizationId}`)
        console.log(`Default Org Name: ${user.defaultOrganization?.name}`)

        // Auth logic simulation
        const effectiveOrgId = user.defaultOrganizationId || user.memberships[0]?.organizationId
        console.log(`Effective POS Org ID: ${effectiveOrgId}`)

        // Check match
        const match = catalogOrgs.find(o => o.id === effectiveOrgId)
        if (match) {
            console.log(`MATCH! User is logged into Catalog Org: ${match.name}`)
        } else {
            console.log(`MISMATCH! User is NOT logged into a Catalog Org.`)
            console.log(`User is in: ${user.defaultOrganization?.name || user.memberships[0]?.organization?.name || 'Unknown'}`)
        }
    } else {
        console.log('\nUser "jani..." not found.')
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
