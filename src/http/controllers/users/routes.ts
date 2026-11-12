import type { FastifyInstance } from "fastify";
import { verifySession } from "@/http/middlewares/verify-session";
import { getUserProfile } from "./get-user-profile";
import { inactivateUser } from "./inactivate-user";

export async function usersRoutes(app: FastifyInstance) {
  /** Authenticated */
  app.get("/me", { onRequest: [verifySession] }, getUserProfile);
  app.patch(
    "/users/:id/inactivate",
    { onRequest: [verifySession] },
    inactivateUser,
  );
}
