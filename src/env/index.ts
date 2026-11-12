import 'dotenv/config'
import { Buffer } from 'node:buffer'
import {z} from 'zod'

const envSchema = z.object({
    NODE_ENV: z.enum(["dev", "test", "production"]),
    PORT: z.coerce.number().default(3333),
    DATABASE_URL: z.url(),
    BETTER_AUTH_URL: z.url().default("http://localhost:3333"),
    BETTER_AUTH_SECRET: z.string().min(32),
    ENCRYPTION_KEY: z
        .string()
        .refine((value) => Buffer.from(value, "base64").length === 32, {
            message:
                "ENCRYPTION_KEY must be 32 bytes in base64. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
        }),
})
const _env = envSchema.safeParse(process.env)
if(!_env.success){
    console.error("Invalid environment variables", z.treeifyError(_env.error))
    throw new Error("Invalid environment variables")
}
export const env = _env.data
