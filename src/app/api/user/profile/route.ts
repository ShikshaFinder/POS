import { authenticateRequest } from '@/lib/auth-mobile'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
    try {
        const user = await authenticateRequest(req)
    if (!user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await req.json()
        const { phone, location, bio, website, name, postalCode } = data

        console.log('Received profile update data:', data);

        // Debug logging to file
        const fs = require('fs');
        const path = require('path');
        const debugPath = path.join(process.cwd(), 'debug-profile-update.json');
        fs.writeFileSync(debugPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            sessionUser: user,
            receivedData: data
        }, null, 2));

        // Update User name directly
        await (prisma.user.update as any)({
            where: { email: user.email },
            data: {
                name: name
            }
        })

        // Upsert UserProfile
        // First find the user to get ID
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (!dbUser) throw new Error("User not found")

        const updateResult = await prisma.userProfile.upsert({
            where: { userId: dbUser.id },
            create: {
                userId: dbUser.id,
                fullName: name || user.name || 'User',
                phone: phone,
                address: location,
                postalCode: postalCode,
                bio: bio,
            },
            update: {
                fullName: name,
                phone: phone,
                address: location,
                postalCode: postalCode,
                bio: bio
            }
        })

        // Log result
        const resultPath = path.join(process.cwd(), 'debug-profile-result.json');
        fs.writeFileSync(resultPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            result: updateResult
        }, null, 2));

        return NextResponse.json({ success: true, profile: updateResult })
    } catch (error: any) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
