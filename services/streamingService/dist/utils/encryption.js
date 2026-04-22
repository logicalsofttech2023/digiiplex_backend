import crypto from "crypto";
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || "12345678901234567890123456789012"); // 32 chars
const IV_LENGTH = 16;
export const encryptPassword = (password) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(password, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
};
export const decryptPassword = (encrypted) => {
    const [ivHex, encryptedText] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};
export const verifyPassword = (inputPassword, storedEncrypted) => {
    const decrypted = decryptPassword(storedEncrypted);
    return decrypted === inputPassword;
};
//# sourceMappingURL=encryption.js.map