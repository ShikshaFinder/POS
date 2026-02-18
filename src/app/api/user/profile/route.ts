
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await req.json()
        const { phone, location, bio, website, name } = data

        // Update User name directly
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                name: name
            }
        })

        // Upsert UserProfile
        // First find the user to get ID
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user) throw new Error("User not found")

        await prisma.userProfile.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                fullName: name || session.user.name || 'User',
                phone: phone,
                address: location,
                bio: bio,
                // website is not in schema currently, we can add it or ignore it. 
                // schema has: fullName, phone, address, city, state, postalCode, country, roleTitle, bio
            },
            update: {
                fullName: name,
                phone: phone,
                address: location,
                bio: bio
            }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
