export interface RevealedCredential {
  id: string;
  password: string;
}

export function toRevealedCredential(
  id: string,
  password: string,
): RevealedCredential {
  return { id, password };
}