import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { expo } from "@better-auth/expo";
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL, "http://localhost:3333", "klyro://",  "exp://192.168.30.24:8081",],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // Disable auto sign-in after registration
    password: {
      hash: (password) => hash(password, 6

      ),
      verify: ({ hash: passwordHash, password }) =>
        compare(password, passwordHash),
    },
  },
  plugins: [expo()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") {
        return;
      }
      const email = ctx.body?.email;
      if (typeof email !== "string") {
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true },
      });

      if (user && !user.isActive) {
        throw new APIError("FORBIDDEN", {
          message: "Usuário inativado",
        });
      }
    }),
  },
});
