import { Router } from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

const router = Router();
const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get("/", async (req, res, next) => {
  try {
    const { month } = req.query;
    const filter = {};
    if (month) {
      if (!validMonth.test(month)) return res.status(400).json({ message: "Month must use YYYY-MM format." });
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      filter.date = { $gte: start, $lt: end };
    }
    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid transaction id." });
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!transaction) return res.status(404).json({ message: "Transaction not found." });
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid transaction id." });
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ message: "Transaction not found." });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
