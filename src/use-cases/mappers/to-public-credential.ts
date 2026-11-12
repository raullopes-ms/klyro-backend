import type { Vault } from "@/prisma/client";

export interface PublicCredential {
  id: string;
  serviceName: string;
  username: string;
  serviceUrl: string | null;
  notes: string | null;
  favorite: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicCredential(vault: Vault): PublicCredential {
  return {
    id: vault.id,
    serviceName: vault.serviceName,
    username: vault.username,
    serviceUrl: vault.serviceUrl,
    notes: vault.notes,
    favorite: vault.favorite,
    userId: vault.userId,
    createdAt: vault.createdAt,
    updatedAt: vault.updatedAt,
  };
}
