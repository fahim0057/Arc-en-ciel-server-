import { Router } from "express";
import { Filter, ObjectId } from "mongodb";
import { EventDoc, getCollections } from "../config/db";
import { escapeRegex, objectIdRegex, startOfToday } from "../lib/validation";
import { verifyJWT } from "../middleware/verifyJWT";
const router = Router();

const toObjectId = (id: string | string[] | undefined) =>
  typeof id === "string" && objectIdRegex.test(id) ? new ObjectId(id) : null;

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

// GET /events/:id   one event, participant count, and whether it already happened
router.get("/events/:id", async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid event id" });
    return;
  }

  const { events, joins } = await getCollections();
  const event = await events.findOne({ _id });
  if (!event) {
    res.status(404).json({ message: "Event not found" });
    return;
  }

  const participantCount = await joins.countDocuments({ eventId: _id });
  const hasPassed = event.eventDate.getTime() < startOfToday().getTime();
  res.json({ ...event, participantCount, hasPassed });
});
/* ---------------------------- PROTECTED ROUTES --------------------------- */

// Join an event
router.post("/events/:id/join", verifyJWT, async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid event id" });
    return;
  }

  const { events, joins } = await getCollections();
  const event = await events.findOne({ _id });
  if (!event) {
    res.status(404).json({ message: "Event not found" });
    return;
  }
  if (event.eventDate.getTime() < startOfToday().getTime()) {
    res.status(400).json({ message: "This event has already passed" });
    return;
  }

  try {
    await joins.insertOne({
      eventId: _id,
      userEmail: req.user!.email,
      userName: req.user!.name ?? "Anonymous",
      joinedAt: new Date(),
    });
    res.status(201).json({ message: "You have joined this event" });
  } catch (err) {
    // 11000 = duplicate key: the unique {eventId, userEmail} index rejected it
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ message: "You have already joined this event" });
      return;
    }
    throw err;
  }
});

// Has the current user already joined this event?
// Has the current user already joined this event?
router.get("/events/:id/join-status", verifyJWT, async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid event id" });
    return;
  }

  const { joins } = await getCollections();
  const count = await joins.countDocuments({ eventId: _id, userEmail: req.user!.email });
  res.json({ joined: count > 0 });
});

export default router;