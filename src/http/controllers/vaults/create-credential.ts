import { UnauthorizedError } from "@/use-cases/errors/unauthorized-error";
import { makeCreateCredentialUseCase } from "@/use-cases/factories/make-create-credential-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function createCredential(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createCredentialBodySchema = z.object({
    serviceName: z.string(),
    username: z.string(),
    password: z.string(),
    serviceUrl: z.url().optional(),
    notes: z.string().max(1000).optional(),
    favorite: z.boolean().optional(),
  });
  const { serviceName, username, password, serviceUrl, notes, favorite } =
    createCredentialBodySchema.parse(request.body);
  try {
    const createCredentialUseCase = makeCreateCredentialUseCase();
    await createCredentialUseCase.execute({
      serviceName,
      username,
      password,
      serviceUrl,
      notes,
      favorite,
      userId: request.user.sub,
    });
    return reply
      .status(201)
      .send({ message: "Credential created successfully" });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message });
    }
    throw error;
  }
}
