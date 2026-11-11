import { makeListCredentialsUseCase } from "@/use-cases/factories/make-list-credentials-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function listCredentials(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const listCredentialsUseCase = makeListCredentialsUseCase();
  const { vaults } = await listCredentialsUseCase.execute({
    userId: request.user.sub,
  });

  return reply.status(200).send({ credentials: vaults });
}
