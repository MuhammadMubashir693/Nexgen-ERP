import { prisma } from "../../lib/prisma";
import { getAvatarPublicUrl } from "../../lib/avatar";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function getCurrentUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          designation: true,
          avatarUrl: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          gender: true,
          dateOfBirth: true,
          dateOfJoining: true,
          employmentType: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    themeAccent: user.themeAccent,
    department: user.department,
    employee: user.employee
      ? {
        id: user.employee.id,
        employeeCode: user.employee.employeeCode,
        firstName: user.employee.firstName,
        lastName: user.employee.lastName,
        designation: user.employee.designation,
        phone: user.employee.phone,
        address: user.employee.address,
        gender: user.employee.gender,
        dateOfBirth: user.employee.dateOfBirth ? user.employee.dateOfBirth.toISOString().slice(0, 10) : null,
        dateOfJoining: user.employee.dateOfJoining ? user.employee.dateOfJoining.toISOString().slice(0, 10) : null,
        employmentType: user.employee.employmentType,
        status: user.employee.status,
        avatarUrl: getAvatarPublicUrl(user.employee.avatarUrl),
      }
      : null,
  };
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    address?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    themeAccent?: string;
  },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });

  if (!user) {
    throw new Error("User profile not found");
  }

  const updatedName =
    input.name ??
    (input.firstName || input.lastName
      ? `${input.firstName ?? user.employee?.firstName ?? ''} ${input.lastName ?? user.employee?.lastName ?? ''}`.trim()
      : undefined);

  await prisma.$transaction(async (tx) => {
    if (updatedName || input.themeAccent) {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: updatedName ?? undefined,
          themeAccent: input.themeAccent ?? undefined,
        },
      });
    }

    if (user.employee) {
      await tx.employee.update({
        where: { id: user.employee.id },
        data: {
          firstName: input.firstName ?? undefined,
          lastName: input.lastName ?? undefined,
          phone: input.phone !== undefined ? input.phone : undefined,
          address: input.address !== undefined ? input.address : undefined,
          gender: input.gender !== undefined ? input.gender : undefined,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        },
      });
    }
  });

  return getCurrentUserProfile(userId);
}

export async function changeUserPassword(userId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message || "Could not update password");
  }

  return { success: true, message: "Password updated successfully" };
}
