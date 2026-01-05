import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/invite/validate?token=xxx - Validate invitation token
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invite = await prisma.organizationInvite.findFirst({
      where: {
        token,
        status: 'PENDING',
        inviteType: 'POS_OWNER',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        posLocation: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
          },
        },
        invitedBy: {
          select: {
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invite.expiresAt) < new Date()) {
      // Update status to expired
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invite.id,
        email: invite.email,
        organization: invite.organization,
        posLocation: invite.posLocation,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt,
      },
      userExists: !!existingUser,
    });
  } catch (error) {
    console.error('Failed to validate invitation:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}
