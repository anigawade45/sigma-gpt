import express from 'express';
const router = express.Router();
import Thread from '../models/Thread.js';
import getOpenAIResponse from '../utils/openai.js';
import { authenticate } from '../middleware/authMiddleware.js'; // protect routes

// test - optional
router.post("/test", authenticate, async (req, res) => {
    try {
        const thread = new Thread({
            threadId: "xyz",
            user: req.user._id,
            title: "Testing New Thread"
        });

        const response = await thread.save();
        res.send(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to save in DB" });
    }
});

// GET ALL threads for authenticated user
router.get("/threads", authenticate, async (req, res) => {
    try {
        const threads = await Thread.find({ user: req.user._id }).sort({ updatedAt: -1 });
        res.json(threads);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to retrieve threads" });
    }
});

// GET a single thread by ID (threadId) for authenticated user
router.get("/thread/:threadId", authenticate, async (req, res) => {
    const { threadId } = req.params;
    try {
        const thread = await Thread.findOne({ threadId, user: req.user._id });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(thread.messages);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to retrieve thread" });
    }
});

// DELETE a thread by ID for authenticated user
router.delete("/thread/:threadId", authenticate, async (req, res) => {
    const { threadId } = req.params;
    try {
        const deletedThread = await Thread.findOneAndDelete({ threadId, user: req.user._id });

        if (!deletedThread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json({ message: "Thread deleted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

// POST chat - authenticated
router.post("/chat", authenticate, async (req, res) => {
    const { threadId, message } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({ error: "threadId and message are required" });
    }

    try {
        let thread = await Thread.findOne({ threadId, user: req.user._id });

        if (!thread) {
            // create a new thread in DB for this user
            thread = new Thread({
                threadId,
                user: req.user._id,
                title: message,
                messages: [{ role: "user", content: message }]
            });
        } else {
            thread.messages.push({ role: "user", content: message });
        }

        const assistantReply = await getOpenAIResponse([{ role: "user", content: message }]);

        thread.messages.push({ role: "assistant", content: assistantReply });
        thread.updatedAt = new Date();
        await thread.save();
        res.json({ reply: assistantReply });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to add message" });
    }
});

export default router;