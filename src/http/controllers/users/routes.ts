import type { FastifyInstance } from "fastify";
import { register } from "./register";
import { authenticate } from "./authenticate";
import { verifyJwt } from "@/http/middlewares/verify-jwt";
import { getUserProfile } from "./get-user-profile";
import { inactivateUser } from "./inactivate-user";

export async function usersRoutes(app: FastifyInstance) {
  app.post("/register", register);
  app.post("/authenticate", authenticate);

  /** Authenticated */
  app.get("/me", { onRequest: [verifyJwt] }, getUserProfile);
  app.patch(
    "/users/:id/inactivate",
    { onRequest: [verifyJwt] },
    inactivateUser,
  );
}
