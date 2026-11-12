import { makeDeleteCredentialUseCase } from "@/use-cases/factories/make-delete-credential-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function deleteCredential(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteCredentialParamsSchema = z.object({
    id: z.string().min(1),
  });
  const { id } = deleteCredentialParamsSchema.parse(request.params);

  const deleteCredentialUseCase = makeDeleteCredentialUseCase();
  await deleteCredentialUseCase.execute({
    credentialId: id,
    userId: request.user.id,
  });

  return reply.status(204).send();
}
