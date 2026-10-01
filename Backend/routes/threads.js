import express from "express";
import Thread from "../models/Thread.js";
import Reply from "../models/Reply.js";
import { protect, allowRoles } from "../middleware/auth.js";
import { createNotification } from "../utils/notify.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 6, 1), 50);
    const search = (req.query.search || "").trim();

    const filter = search
      ? { $or: [{ title: { $regex: search, $options: "i" } }, { body: { $regex: search, $options: "i" } }, { tags: { $regex: search, $options: "i" } }] }
      : {};

    const [threads, total] = await Promise.all([
      Thread.find(filter)
        .populate("author", "name role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Thread.countDocuments(filter)
    ]);

    res.json({ threads, page, pages: Math.ceil(total / limit), total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { title, body, tags = [] } = req.body;
    if (!title || !body) return res.status(400).json({ message: "Title and body are required" });

    const thread = await Thread.create({ title, body, tags, author: req.user.id });
    const populated = await thread.populate("author", "name role");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id).populate("author", "name role");
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    const replies = await Reply.find({ thread: thread._id }).populate("author", "name role").sort({ createdAt: 1 });
    res.json({ thread, replies });
  } catch (err) {
    res.status(500).json({ message: "Invalid thread id" });
  }
});

router.post("/:id/replies", protect, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "Reply is required" });

    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const reply = await Reply.create({ thread: thread._id, author: req.user.id, body });
    const populated = await reply.populate("author", "name role");

    const io = req.app.get("io");
    if (thread.author.toString() !== req.user.id) {
      await createNotification(io, thread.author, `${req.user.name} replied to your discussion`, `/threads/${thread._id}`);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/vote", protect, async (req, res) => {
  try {
    const value = Number(req.body.value);
    if (![1, -1].includes(value)) return res.status(400).json({ message: "Vote must be 1 or -1" });

    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const existing = thread.votes.find(v => v.user.toString() === req.user.id);
    if (existing) existing.value = existing.value === value ? 0 : value;
    else thread.votes.push({ user: req.user.id, value });

    thread.votes = thread.votes.filter(v => v.value !== 0);
    await thread.save();

    res.json({ score: thread.votes.reduce((sum, v) => sum + v.value, 0), votes: thread.votes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:threadId/replies/:replyId/accept", protect, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.threadId);
    const reply = await Reply.findById(req.params.replyId);
    if (!thread || !reply || reply.thread.toString() !== thread._id.toString()) {
      return res.status(404).json({ message: "Thread or reply not found" });
    }

    const isOwner = thread.author.toString() === req.user.id;
    if (!isOwner && !["moderator", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only the thread owner or moderator/admin can accept an answer" });
    }

    await Reply.updateMany({ thread: thread._id }, { $set: { accepted: false } });
    reply.accepted = true;
    await reply.save();

    const io = req.app.get("io");
    if (reply.author.toString() !== req.user.id) {
      await createNotification(io, reply.author, "Your answer was accepted", `/threads/${thread._id}`);
    }

    res.json({ message: "Answer accepted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const owner = thread.author.toString() === req.user.id;
    const privileged = ["moderator", "admin"].includes(req.user.role);
    if (!owner && !privileged) return res.status(403).json({ message: "Access denied" });

    await Reply.deleteMany({ thread: thread._id });
    await thread.deleteOne();
    res.json({ message: "Thread deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
