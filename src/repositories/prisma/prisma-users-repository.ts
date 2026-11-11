import type { Prisma } from "@/prisma/client";
import { prisma } from "@/lib/prisma";
import type { UsersRepository } from "../users-repository";

export class PrismaUsersRepository implements UsersRepository {
  async findById(id: string) {
    return await prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return await prisma.user.create({
      data,
    });
  }
  async inactivateUser(id: string) {
    return await prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}
