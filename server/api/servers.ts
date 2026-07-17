import { MongoClient, type Document } from 'mongodb';

interface ServerListing extends Document {
  ip: string;
  port: number;
  title: string;
  owner: string;
  loadedCards: number;
  onlinePlayers: number;
  phase: string;
  requirePassword: boolean;
  tls: boolean;
  updatedAt: Date;
}

export default defineEventHandler(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) return [];
  const client = new MongoClient(uri);
  try {
    const collection = client.db('aeonfront').collection<ServerListing>('servers');
    const records = await collection.find({ updatedAt: { $gte: new Date(Date.now() - 5 * 60_000) } }).sort({ updatedAt: -1 }).limit(100).toArray();
    return records.map((record) => ({
      id: record._id.toString(),
      ip: record.ip,
      port: record.port,
      title: record.title || 'Aeonfront Server',
      owner: record.owner || 'Unknown',
      loadedCards: record.loadedCards || 0,
      onlinePlayers: record.onlinePlayers || 0,
      phase: record.phase || 'lobby',
      requirePassword: Boolean(record.requirePassword),
      tls: Boolean(record.tls),
      updatedAt: record.updatedAt
    }));
  } catch (error) {
    console.error('Server listing query failed.', error);
    throw createError({ statusCode: 503, statusMessage: 'Server listing unavailable' });
  } finally {
    await client.close();
  }
});
