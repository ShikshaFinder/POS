import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Verifying New Auth Logic ---')

    // Check the User 'janih' (guessing partial email match)
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'jani' } },
        include: {
            defaultOrganization: true,
            memberships: {
                include: {
                    organization: true
                }
            }
        }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log(`User: ${user.email}`)
    console.log(`Default Org: ${user.defaultOrganization?.name} (Catalog Enabled: ${user.defaultOrganization?.catalogEnabled})`)

    // --- NEW LOGIC ---
    const defaultOrg = user.defaultOrganization;
    const catalogOrgMembership = user.memberships.find((m: any) => m.organization.catalogEnabled);

    let currentOrgId = user.defaultOrganizationId;

    if (defaultOrg?.catalogEnabled) {
        console.log('Decision: Default Org has catalog enabled. Keeping it.')
        currentOrgId = user.defaultOrganizationId;
    } else if (catalogOrgMembership) {
        console.log(`Decision: Default Org catalog disabled. Switching to Catalog Org: ${catalogOrgMembership.organization.name}`)
        currentOrgId = catalogOrgMembership.organizationId;
    } else {
        console.log('Decision: No catalog org found. Fallback.')
        currentOrgId = user.defaultOrganizationId || user.memberships[0]?.organizationId;
    }
    // ----------------

    console.log(`Selected Org ID: ${currentOrgId}`)

    if (currentOrgId) {
        const productCount = await prisma.product.count({ where: { organizationId: currentOrgId } })
        console.log(`Products in Selected Org: ${productCount}`)
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
