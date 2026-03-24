import mongoose from "mongoose";
const genreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
    },
    description: String,
    image: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
const Genre = mongoose.model("genre", genreSchema);
export default Genre;
//# sourceMappingURL=GenreModel.js.map