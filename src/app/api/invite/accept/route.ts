import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/invite/accept - Accept invitation and create/update user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, fullName, phone } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invite = await prisma.organizationInvite.findFirst({
      where: {
        token,
        status: 'PENDING',
        inviteType: 'POS_OWNER',
      },
      include: {
        organization: true,
        posLocation: true,
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
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (user) {
      // User exists - update their password and ensure they're linked to this organization
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: true,
          profile: {
            upsert: {
              create: {
                fullName: fullName || user.email.split('@')[0],
                phone: phone,
              },
              update: {
                ...(fullName && { fullName }),
                ...(phone && { phone }),
              },
            },
          },
        },
      });

      // Check if membership already exists
      const existingMembership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invite.organizationId,
          },
        },
      });

      if (!existingMembership) {
        // Create membership
        await prisma.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: invite.organizationId,
            role: invite.role,
          },
        });
      }

      // Create UserRole for POS_OWNER
      const existingRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleValue: '13', // POS_OWNER
        },
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleValue: '13',
            roleKey: 'POS_OWNER',
          },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          emailVerified: true,
          defaultOrganizationId: invite.organizationId,
          profile: {
            create: {
              fullName: fullName || invite.email.split('@')[0],
              phone: phone,
            },
          },
          memberships: {
            create: {
              organizationId: invite.organizationId,
              role: invite.role,
            },
          },
          roles: {
            create: {
              roleValue: '13', // POS_OWNER
              roleKey: 'POS_OWNER',
            },
          },
        },
      });
    }

    // Update POS Location with owner
    if (invite.posLocationId) {
      await prisma.pOSLocation.update({
        where: { id: invite.posLocationId },
        data: {
          ownerId: user.id,
          status: 'ACTIVE',
        },
      });
    }

    // Mark invitation as accepted
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      user: {
        id: user.id,
        email: user.email,
      },
      posLocation: invite.posLocation ? {
        id: invite.posLocation.id,
        name: invite.posLocation.name,
      } : null,
    });
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
