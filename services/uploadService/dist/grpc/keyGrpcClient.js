import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { KEY_MANAGEMENT_GRPC_ADDRESS } from "../constants/constant.js";
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
const client = new keyPackage.KeyService(KEY_MANAGEMENT_GRPC_ADDRESS, grpc.credentials.createInsecure());
const promisifyUnary = (method) => new Promise((resolve, reject) => {
    client[method]({}, (error, response) => {
        if (error) {
            reject(error);
            return;
        }
        resolve(response);
    });
});
export const getActiveKeyViaGrpc = () => promisifyUnary("GetActiveKey");
export const getPublicKeysViaGrpc = () => promisifyUnary("GetPublicKeys");
//# sourceMappingURL=keyGrpcClient.js.map