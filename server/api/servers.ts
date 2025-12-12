import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export default defineEventHandler(async (event) => {
    try {
        await client.connect();
        const db = client.db("war_drafting");
        const collection = db.collection("servers");

        const serversRaw = await collection.find().sort({ updatedAt: -1 }).toArray();

        const servers = serversRaw.map(s => ({
            _id: s._id.toString(),
            ip: s.ip,
            port: s.port,
            title: s.title ?? "未知服务器",
            owner: s.owner ?? "未知",
            loadedCharacters: s.loadedCharacters ?? 0,
            onlinePlayers: s.onlinePlayers ?? 0,
            status: s.status ?? 0,
            requirePassword: s.requirePassword ?? false,
            tls: s.tls ?? false,
            updatedAt: s.updatedAt ?? new Date(),
        }));

        return servers;
    } catch (e) {
        console.error(e);
        return sendError(event, { statusCode: 500, statusMessage: "Database error" });
    } finally {
        await client.close();
    }
});
