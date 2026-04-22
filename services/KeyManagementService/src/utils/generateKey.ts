import { generateKeyPair as generateRsaKeyPair } from "crypto";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const generateKeyPair = async (): Promise<KeyPair> =>
  new Promise((resolve, reject) => {
    generateRsaKeyPair(
      "rsa",
      {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      },
      (error, publicKey, privateKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({ publicKey, privateKey });
      },
    );
  });
