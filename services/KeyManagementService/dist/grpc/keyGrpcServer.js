import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { getActiveKey, getPublicKeys } from "../services/key.service.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoCandidates = [
    path.resolve(__dirname, "../../../../packages/proto/keys.proto"),
    path.resolve(process.cwd(), "packages/proto/keys.proto"),
    path.resolve(process.cwd(), "proto/keys.proto"),
];
const protoPath = protoCandidates.find((candidate) => fs.existsSync(candidate));
if (!protoPath) {
    throw new Error(`keys.proto not found. Checked: ${protoCandidates.join(", ")}`);
}
const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const loadedProto = grpc.loadPackageDefinition(packageDefinition);
const keyPackage = loadedProto.keys;
export const startKeyGrpcServer = async (address) => {
    const server = new grpc.Server();
    server.addService(keyPackage.KeyService.service, {
        GetActiveKey: async (_call, callback) => {
            try {
                const key = await getActiveKey();
                if (!key) {
                    callback({
                        code: grpc.status.NOT_FOUND,
                        message: "No active key found",
                    });
                    return;
                }
                callback(null, {
                    kid: key.kid,
                    publicKey: key.publicKey,
                    privateKey: key.privateKey,
                });
            }
            catch (error) {
                callback({
                    code: grpc.status.INTERNAL,
                    message: error instanceof Error ? error.message : "Failed to fetch active key",
                });
            }
        },
        GetPublicKeys: async (_call, callback) => {
            try {
                const keys = await getPublicKeys();
                callback(null, {
                    keys: keys.map((key) => ({
                        kid: key.kid,
                        publicKey: key.publicKey,
                    })),
                });
            }
            catch (error) {
                callback({
                    code: grpc.status.INTERNAL,
                    message: error instanceof Error ? error.message : "Failed to fetch public keys",
                });
            }
        },
    });
    await new Promise((resolve, reject) => {
        server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error) => {
            if (error) {
                reject(error);
                return;
            }
            server.start();
            resolve();
        });
    });
    return server;
};
//# sourceMappingURL=keyGrpcServer.js.map