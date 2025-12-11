import { MongoClient } from "mongodb";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    const { ip, port, title, owner, loadedCharacters, onlinePlayers, status } = req.body;

    if (!ip || !port) return res.status(400).json({ message: "IP and port are required" });

    try {
        await client.connect();
        const db = client.db("war_drafting");
        const collection = db.collection("servers");

        const now = new Date();

        const result = await collection.updateOne(
            { ip, port },
            { $set: { title, owner, loadedCharacters, onlinePlayers, status, updatedAt: now }, $setOnInsert: { createdAt: now } },
            { upsert: true }
        );

        res.status(200).json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Database error" });
    } finally {
        await client.close();
    }
}
