import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    limit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

budgetSchema.index({ month: 1, category: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
