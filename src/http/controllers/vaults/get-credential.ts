import { makeGetCredentialUseCase } from "@/use-cases/factories/make-get-credential-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function getCredential(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const getCredentialParamsSchema = z.object({
    id: z.string().min(1),
  });
  const { id } = getCredentialParamsSchema.parse(request.params);
  const getCredentialUseCase = makeGetCredentialUseCase();
  const { credential } = await getCredentialUseCase.execute({
    credentialId: id,
    userId: request.user.sub,
  });
  return reply
    .header("Cache-Control", "no-store")
    .status(200)
    .send({ credential });
}
