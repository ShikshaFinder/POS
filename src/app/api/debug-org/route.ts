
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
    try {
        const email = 'ashish05060+finaltest@gmail.com'
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    include: {
                        organization: true
                    }
                },
                defaultOrganization: true,
                profile: true // Include profile for debugging
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' })
        }

        const data = {
            id: user.id,
            email: user.email,
            name: (user as any).name,
            defaultOrganizationId: user.defaultOrganizationId,
            defaultOrganization: user.defaultOrganization,
            memberships: user.memberships,
            profile: user.profile
        }

        // Write to file for debugging
        const filePath = path.join(process.cwd(), 'debug-output-user-profile.json')
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
