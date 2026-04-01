import mongoose from "mongoose";
const languageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    image: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
export default mongoose.model("Language", languageSchema);
//# sourceMappingURL=languageModel.js.map