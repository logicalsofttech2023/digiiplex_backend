import { generateKeyPair as generateRsaKeyPair } from "crypto";
export const generateKeyPair = async () => new Promise((resolve, reject) => {
    generateRsaKeyPair("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    }, (error, publicKey, privateKey) => {
        if (error) {
            reject(error);
            return;
        }
        resolve({ publicKey, privateKey });
    });
});
//# sourceMappingURL=generateKey.js.map