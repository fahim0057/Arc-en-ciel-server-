import { MongoClient, ObjectId, Collection, Db } from "mongodb";

export interface EventDoc {
  _id?: ObjectId;
  title: string;
  description: string;
  eventType: string;
  thumbnail: string;
  location: string;
  eventDate: Date; // stored as UTC midnight of the chosen calendar date
  creatorEmail: string;
  creatorName: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface JoinDoc {
  _id?: ObjectId;
  eventId: ObjectId;
  userEmail: string;
  userName: string;
  joinedAt: Date;
}

// Cache the connection so we don't open a new one on every request.
let dbPromise: Promise<Db> | null = null;

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.DB_NAME || "community_events");

  // Indexes are safe to run repeatedly
  await Promise.all([
    db.collection("events").createIndex({ eventDate: 1 }),
    db.collection("events").createIndex({ creatorEmail: 1 }),
    // One user can join a given event only once
    db.collection("joins").createIndex({ eventId: 1, userEmail: 1 }, { unique: true }),
    db.collection("joins").createIndex({ userEmail: 1 }),
  ]);

  return db;
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = connect().catch((err) => {
      dbPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return dbPromise;
}

export async function getCollections(): Promise<{
  events: Collection<EventDoc>;
  joins: Collection<JoinDoc>;
}> {
  const db = await getDb();
  return {
    events: db.collection<EventDoc>("events"),
    joins: db.collection<JoinDoc>("joins"),
  };
}