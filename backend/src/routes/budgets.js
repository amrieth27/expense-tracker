import { Router } from "express";
import Budget from "../models/Budget.js";

const router = Router();
const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get("/", async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !validMonth.test(month)) {
      return res.status(400).json({ message: "A valid month in YYYY-MM format is required." });
    }
    res.json(await Budget.find({ month }).sort({ category: 1 }).lean());
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { month, category, limit } = req.body;
    if (!validMonth.test(month || "")) {
      return res.status(400).json({ message: "Month must use YYYY-MM format." });
    }
    const budget = await Budget.findOneAndUpdate(
      { month, category },
      { month, category, limit },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: "Budget not found." });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
