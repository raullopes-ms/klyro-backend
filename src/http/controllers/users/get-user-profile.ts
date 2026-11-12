import { makeGetUserProfileUseCase } from "@/use-cases/factories/make-get-user-profile-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function getUserProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const getUserProfileUseCase = makeGetUserProfileUseCase();
  const { user } = await getUserProfileUseCase.execute({
    userId: request.user.id,
  });
  return reply.status(200).send({ user });
}
