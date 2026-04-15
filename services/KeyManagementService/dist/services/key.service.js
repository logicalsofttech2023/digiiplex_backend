import { generateKeyPair } from "../utils/generateKey.js";
import { randomUUID } from "crypto";
import { db } from "../config/db.js";
import { keys } from "../db/schema.js";
import { eq } from "drizzle-orm";
export const createNewKey = async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const kid = randomUUID();
    await db
        .update(keys)
        .set({ status: "inactive" })
        .where(eq(keys.status, "active"));
    const [key] = await db
        .insert(keys)
        .values({
        kid: kid,
        publicKey: publicKey,
        privateKey: privateKey,
        status: "active",
    })
        .returning();
    return key;
};
export const getPublicKeys = async () => {
    return await db
        .select({
        kid: keys.kid,
        publicKey: keys.publicKey,
    })
        .from(keys);
};
export const getActiveKey = async () => {
    const [key] = await db.select().from(keys).where(eq(keys.status, "active"));
    return key;
};
//# sourceMappingURL=key.service.js.map