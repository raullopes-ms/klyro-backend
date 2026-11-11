import type { Prisma } from "@/prisma/client";
import type { VaultsRepository } from "../vaults-repository";
import { prisma } from "@/lib/prisma";

export class PrismaVaultsRepository implements VaultsRepository {
  async findByIdAndUserId(id: string, userId: string) {
    return await prisma.vault.findFirst({ where: { id, userId } });
  }

  async findManyByUserId(userId: string) {
    return await prisma.vault.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Prisma.VaultUncheckedCreateInput) {
    return await prisma.vault.create({ data });
  }
}
