import { UnauthorizedError } from "@/use-cases/errors/unauthorized-error";
import { makeUpdateCredentialUseCase } from "@/use-cases/factories/make-update-credential-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function updateCredential(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const getCredentialParamsSchema = z.object({
    id: z.string().min(1),
  });
  const UpdateCredentialBodySchema = z
    .object({
      serviceName: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      serviceUrl: z.string().optional(),
      favorite: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .strict();
  const { id } = getCredentialParamsSchema.parse(request.params);
  const { serviceName, username, password, serviceUrl, favorite, notes } =
    UpdateCredentialBodySchema.parse(request.body);
  try {
    const updateCredentialUseCase = makeUpdateCredentialUseCase();
    const { vault } = await updateCredentialUseCase.execute({
      credentialId: id,
      serviceName,
      username,
      password,
      serviceUrl,
      favorite,
      notes,
      userId: request.user.id,
    });
    return reply.status(200).send({ vault });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message });
    }
    throw error;
  }
}
