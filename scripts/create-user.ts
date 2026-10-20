import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/server/password";
import { z } from "zod";
const email = z.string().email().max(254).parse(process.env.USER_EMAIL).toLowerCase();
const password = z.string().min(12).max(128).parse(process.env.USER_PASSWORD);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try { await db.user.create({ data: { email, passwordHash: await hashPassword(password) } }); console.log("User created"); }
finally { await db.$disconnect(); }
