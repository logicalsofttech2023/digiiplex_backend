import mongoose from "mongoose";
const adminSchema = new mongoose.Schema({
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
    role: {
        type: String,
        enum: ["admin", "masterAdmin"],
        default: "admin",
    },
}, {
    timestamps: true,
});
const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
//# sourceMappingURL=AdminModel.js.map