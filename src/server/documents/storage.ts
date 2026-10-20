import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { getServerConfig } from "@/config/server";
export function storagePath(key: string) { if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error("Invalid storage key"); return resolve(getServerConfig().STORAGE_ROOT, key); }
export async function store(key: string, bytes: Buffer) { await mkdir(getServerConfig().STORAGE_ROOT, { recursive: true, mode: 0o700 }); await writeFile(storagePath(key), bytes, { flag: "wx", mode: 0o600 }); }
export async function remove(key: string) { try { await unlink(storagePath(key)); } catch(e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; } }
export function read(key: string) { return readFile(storagePath(key)); }
