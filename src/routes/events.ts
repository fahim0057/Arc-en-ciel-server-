import { Router } from "express";
import { Filter, ObjectId } from "mongodb";
import { EventDoc, getCollections } from "../config/db";
import { escapeRegex, objectIdRegex, startOfToday } from "../lib/validation";

const router = Router();

const toObjectId = (id: string) => (objectIdRegex.test(id) ? new ObjectId(id) : null);

// GET /events           all upcoming events
// GET /events?limit=6   for the home page
// GET /events?type=Cleanup&search=lake
router.get("/events", async (req, res) => {
  const { events } = await getCollections();
  const { type, search } = req.query;
  const limit = Math.min(Number(req.query.limit) || 0, 50);

  const filter: Filter<EventDoc> = { eventDate: { $gte: startOfToday() } };

  if (typeof type === "string" && type && type !== "All") {
    filter.eventType = type;
  }
  if (typeof search === "string" && search.trim()) {
    const rx = { $regex: escapeRegex(search.trim()), $options: "i" };
    filter.$or = [{ title: rx }, { location: rx }];
  }

  let cursor = events.find(filter).sort({ eventDate: 1, createdAt: -1 });
  if (limit) cursor = cursor.limit(limit);

  res.json(await cursor.toArray());
});

// GET /events/:id   one event plus how many people joined
router.get("/events/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "Invalid event id" });

  const { events, joins } = await getCollections();
  const event = await events.findOne({ _id });
  if (!event) return res.status(404).json({ message: "Event not found" });

  const participantCount = await joins.countDocuments({ eventId: _id });
  res.json({ ...event, participantCount });
});

export default router;