import mongoose from "mongoose";
import { MongoDB_URL } from "../constants/constant.js";
const connectDB = async () => {
    try {
        if (!MongoDB_URL.URL) {
            throw new Error("MONGO_URI is missing in .env");
        }
        await mongoose.connect(MongoDB_URL.URL);
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};
export default connectDB;
//# sourceMappingURL=db.js.map