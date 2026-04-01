import mongoose from "mongoose";
const genreSchema = new mongoose.Schema({
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
export default mongoose.model("Genre", genreSchema);
//# sourceMappingURL=genreModel.js.map