import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 120, default: "" },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Transaction", transactionSchema);
