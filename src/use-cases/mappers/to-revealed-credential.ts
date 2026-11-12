import type { Vault } from "@/prisma/client";
import {
  toPublicCredential,
  type PublicCredential,
} from "./to-public-credential";

export interface RevealedCredential extends PublicCredential {
  password: string;
}

export function toRevealedCredential(
  vault: Vault,
  password: string,
): RevealedCredential {
  return {
    ...toPublicCredential(vault),
    password,
  };
}
