import { MongoClient } from "mongodb";
import WebSocket from "ws";
import { getRequestIP } from "h3";
import { ipAddress } from "@vercel/functions";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export default defineEventHandler(async (event) => {
    if (event.node.req.method !== "POST") {
        return sendError(event, { statusCode: 405, statusMessage: "Method not allowed" });
    }

    try {
        const body = await readBody(event) as { port: number };
        if (!body.port || !body.ip) return sendError(event, { statusCode: 400, statusMessage: "IP and Port is required" });

        const wsUrl = `ws://${body.ip}:${body.port}`;
        console.log("Verifying " + wsUrl + " for publishing...")

        let serverData: any = null;
        try {
            serverData = await new Promise<any>((resolve, reject) => {
                const ws = new WebSocket(wsUrl, { handshakeTimeout: 2000 });

                ws.on("message", (msg) => {
                    try {
                        console.log(msg.toString())
                        const data = JSON.parse(msg.toString());
                        resolve(data);
                    } catch {
                        reject(new Error("Invalid JSON from server"));
                    } finally {
                        ws.close();
                    }
                });

                ws.on("open", () => {
                    ws.send(JSON.stringify({ action: "status" }));
                });

                ws.on("error", (err) => reject(err));
                ws.on("close", () => {
                    if (!serverData) reject(new Error("Connection closed before receiving data"));
                });
            });
        } catch (e) {
            console.error("WS connection failed", e);
            serverData = null;
        }

        await client.connect();

        if (! serverData) {
            return sendError(event, { statusCode: 401, statusMessage: "Can not connect to server" });
        }

        const db = client.db("war_drafting");
        const collection = db.collection("servers");

        const now = new Date();

        const updateData = {
            ip: body.ip,
            port: body.port,
            title: serverData?.title ?? "未知",
            owner: serverData?.owner ?? "未知",
            loadedCharacters: serverData?.loadedCharacters ?? 0,
            onlinePlayers: serverData?.onlinePlayers ?? 0,
            phase: serverData?.phase ?? 0,
            requirePassword: serverData?.requirePassword ?? false,
            updatedAt: now,
        };

        await collection.updateOne(
            { ip: body.ip, port: body.port },
            { $set: updateData, $setOnInsert: { createdAt: now } },
            { upsert: true }
        );

        return { ok: !!serverData, ...updateData };
    } catch (e) {
        console.error(e);
        return sendError(event, { statusCode: 500, statusMessage: "Database or WS error" });
    } finally {
        await client.close();
    }
});
