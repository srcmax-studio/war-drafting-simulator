import { MongoClient } from "mongodb";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

    try {
        await client.connect();
        const db = client.db("war_drafting");
        const collection = db.collection("servers");

        const servers = await collection.find().sort({ updatedAt: -1 }).toArray();

        res.status(200).json(servers);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
