import { randomUUID } from 'node:crypto';
import { MongoClient, type Document } from 'mongodb';
import WebSocket from 'ws';

interface PublishBody {
  ip: string;
  port: number;
  tls?: boolean;
  product?: string;
}

interface StatusEnvelope {
  event: string;
  protocolVersion: string;
  payload: Record<string, unknown>;
}

const verifyServer = (url: string): Promise<StatusEnvelope> => new Promise((resolve, reject) => {
  const socket = new WebSocket(url, { handshakeTimeout: 3_000 });
  const timeout = setTimeout(() => { socket.terminate(); reject(new Error('Status timeout.')); }, 4_000);
  socket.once('message', (raw) => {
    clearTimeout(timeout);
    try {
      const envelope = JSON.parse(raw.toString()) as StatusEnvelope;
      if (envelope.event !== 'serverStatus' || envelope.protocolVersion !== 'aeonfront/1' || envelope.payload.product !== 'Aeonfront') {
        throw new Error('Endpoint is not a compatible Aeonfront server.');
      }
      resolve(envelope);
    } catch (error) {
      reject(error);
    } finally {
      socket.close();
    }
  });
  socket.once('error', (error) => { clearTimeout(timeout); reject(error); });
});

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, statusMessage: 'Method not allowed' });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw createError({ statusCode: 503, statusMessage: 'Server listing is not configured' });
  const body = await readBody<PublishBody>(event);
  if (!body || typeof body.ip !== 'string' || !/^[a-z0-9.-]+$/i.test(body.ip) || !Number.isInteger(body.port) || body.port < 1 || body.port > 65_535) {
    throw createError({ statusCode: 400, statusMessage: 'Valid host and port are required' });
  }
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(body.ip) || body.ip.startsWith('10.') || body.ip.startsWith('192.168.')) {
    throw createError({ statusCode: 400, statusMessage: 'Public host is required' });
  }
  const url = `${body.tls ? 'wss' : 'ws'}://${body.ip}:${body.port}`;
  let status: StatusEnvelope;
  try {
    status = await verifyServer(url);
  } catch (error) {
    console.error('Server verification failed.', error);
    throw createError({ statusCode: 422, statusMessage: 'Could not verify server endpoint' });
  }
  const client = new MongoClient(uri);
  try {
    const now = new Date();
    const payload = status.payload;
    const listing = {
      ip: body.ip,
      port: body.port,
      title: typeof payload.title === 'string' ? payload.title : 'Aeonfront Server',
      owner: typeof payload.owner === 'string' ? payload.owner : 'Unknown',
      loadedCards: typeof payload.loadedCards === 'number' ? payload.loadedCards : 0,
      onlinePlayers: typeof payload.onlinePlayers === 'number' ? payload.onlinePlayers : 0,
      phase: typeof payload.phase === 'string' ? payload.phase : 'lobby',
      requirePassword: payload.requirePassword === true,
      tls: body.tls === true,
      protocolVersion: status.protocolVersion,
      updatedAt: now
    };
    const collection = client.db('aeonfront').collection<Document>('servers');
    await collection.updateOne({ ip: body.ip, port: body.port }, { $set: listing, $setOnInsert: { listingId: randomUUID(), createdAt: now } }, { upsert: true });
    return { ok: true, ...listing };
  } finally {
    await client.close();
  }
});
