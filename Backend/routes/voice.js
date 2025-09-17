import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import OpenAI from "openai";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const mimeToExt = (mime) => {
    if (!mime) return "webm";
    if (mime.includes("wav")) return "wav";
    if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
    if (mime.includes("ogg")) return "ogg";
    if (mime.includes("webm")) return "webm";
    return "webm";
};

router.post("/voice-to-text", upload.single("file"), async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "No audio file uploaded" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server misconfigured: missing OpenAI API key" });

    const openai = new OpenAI({ apiKey: apiKey });

    // write buffer to temp file
    const ext = mimeToExt(req.file.mimetype);
    const tmpPath = path.join(os.tmpdir(), `voice-${Date.now()}.${ext}`);

    try {
        await writeFile(tmpPath, req.file.buffer);

        // call OpenAI Whisper transcription
        // Using OpenAI SDK v5.x audio.transcriptions.create
        const resp = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tmpPath),
            model: "whisper-1",
        });

        // resp should include `text`
        const text = resp?.text || resp?.data?.text || null;

        // remove temp file
        await unlink(tmpPath);

        if (!text) {
            return res.status(500).json({ error: "Transcription failed (no text returned)" });
        }

        return res.json({ text });
    } catch (err) {
        console.error("voice-to-text error:", err);
        try {
            if (fs.existsSync(tmpPath)) await unlink(tmpPath);
        } catch (e) { }
        return res.status(500).json({ error: "Transcription failed", details: err?.message || err });
    }
});

export default router;