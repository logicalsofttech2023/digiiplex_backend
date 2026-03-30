import mongoose, { Schema } from "mongoose";
const castSchema = new Schema({
    name: { type: String, required: true },
    image: { type: String },
    role: { type: String },
}, { _id: false });
const videoQualitySchema = new Schema({
    quality: { type: String, required: true },
    url: { type: String, required: true },
}, { _id: false });
const movieSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    slug: { type: String, required: true, unique: true },
    genres: [{ type: String, required: true }],
    language: { type: String, required: true },
    releaseYear: { type: Number, required: true },
    ageRating: { type: String, default: "U/A" },
    tags: [{ type: String }],
    thumbnailUrl: { type: String, required: true },
    videoUrl: { type: String, required: true },
    trailerUrl: { type: String },
    videoQualities: [videoQualitySchema],
    cast: [castSchema],
    director: { type: String },
    producer: { type: String },
    duration: { type: Number, required: true },
    rating: { type: Number, min: 0, max: 10 },
    totalViews: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
}, { timestamps: true });
movieSchema.index({ title: "text", description: "text" });
movieSchema.index({ genres: 1 });
movieSchema.index({ slug: 1 });
export const Movie = mongoose.model("Movie", movieSchema);
//# sourceMappingURL=MovieModel.js.map