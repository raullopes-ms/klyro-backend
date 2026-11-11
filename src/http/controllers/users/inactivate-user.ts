import { makeInactivateUserUseCase } from "@/use-cases/factories/make-inactivate-user-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export async function inactivateUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const inactivateUserParamsSchema = z.object({
    id: z.string().min(1),
  });
  const { id } = inactivateUserParamsSchema.parse(request.params);
  const inactivateUserUseCase = makeInactivateUserUseCase();
  const { user } = await inactivateUserUseCase.execute({
    id,
    userId: request.user.sub,
  });
  return reply.status(200).send({ user });
}
