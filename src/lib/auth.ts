import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/index";
import * as schema from "@/db/schema/schema";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        "http://172.20.166.196:3000",
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            age: {
                type: "number",
                required: false,
            },
            phone: {
                type: "string",
                required: false,
            },
            accountType: {
                type: "string",
                required: false,
            },
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
                input: false,
            },
        },
    },
});
