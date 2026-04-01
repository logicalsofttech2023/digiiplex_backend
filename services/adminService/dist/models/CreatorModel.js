import mongoose from "mongoose";
import crypto from "crypto";
const creatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    role: String,
}, {
    timestamps: true,
});
creatorSchema.methods.generateEmailVerificationToken = function () {
    const token = crypto.randomBytes(32).toString("hex");
    this.emailVerificationToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
    this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
    return token;
};
const Creator = mongoose.model("Creator", creatorSchema);
export default Creator;
//# sourceMappingURL=CreatorModel.js.map