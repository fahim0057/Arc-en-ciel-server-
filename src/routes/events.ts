import { Router } from "express";
import { Filter, ObjectId } from "mongodb";
import { EventDoc, getCollections } from "../config/db";
import {
  createEventSchema,
  updateEventSchema,
  escapeRegex,
  objectIdRegex,
  startOfToday,
} from "../lib/validation";
import { verifyJWT } from "../middleware/verifyJWT";

const router = Router();

const toObjectId = (id: string | string[] | undefined) =>
  typeof id === "string" && objectIdRegex.test(id) ? new ObjectId(id) : null;

/* ----------------------------- PUBLIC ROUTES ----------------------------- */

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

// Create an event
router.post("/events", verifyJWT, async (req, res) => {
  // Throws a ZodError on bad data; the error handler turns it into a 400
  const data = createEventSchema.parse(req.body);
  const { events } = await getCollections();

  const doc: EventDoc = {
    ...data,
    creatorEmail: req.user!.email, // from the verified token, never from the request body
    creatorName: req.user!.name ?? "Anonymous",
    createdAt: new Date(),
  };

  const result = await events.insertOne(doc);
  res.status(201).json({ ...doc, _id: result.insertedId });
});

// Events created by the logged-in user, with participant counts
router.get("/my-events", verifyJWT, async (req, res) => {
  const { events } = await getCollections();

  const list = await events
    .aggregate([
      { $match: { creatorEmail: req.user!.email } },
      {
        $lookup: {
          from: "joins",
          localField: "_id",
          foreignField: "eventId",
          as: "joins",
        },
      },
      {
        $addFields: {
          participantCount: { $size: "$joins" },
          hasPassed: { $lt: ["$eventDate", startOfToday()] },
        },
      },
      { $project: { joins: 0 } },
      { $sort: { eventDate: 1 } },
    ])
    .toArray();

  res.json(list);
});

// Update an event (owner only)
router.patch("/events/:id", verifyJWT, async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid event id" });
    return;
  }

  // Same rules as creating, but every field is optional.
  // Unknown fields (such as creatorEmail) are dropped by the schema.
  const data = updateEventSchema.parse(req.body);
  if (Object.keys(data).length === 0) {
    res.status(400).json({ message: "No fields to update" });
    return;
  }

  const { events } = await getCollections();
  const existing = await events.findOne({ _id });
  if (!existing) {
    res.status(404).json({ message: "Event not found" });
    return;
  }
  if (existing.creatorEmail !== req.user!.email) {
    res.status(403).json({ message: "You can only update your own events" });
    return;
  }

  await events.updateOne(
    { _id, creatorEmail: req.user!.email },
    { $set: { ...data, updatedAt: new Date() } }
  );
  res.json({ message: "Event updated" });
});

// Delete an event (owner only), and remove the joins that belonged to it
router.delete("/events/:id", verifyJWT, async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid event id" });
    return;
  }

  const { events, joins } = await getCollections();
  const existing = await events.findOne({ _id });
  if (!existing) {
    res.status(404).json({ message: "Event not found" });
    return;
  }
  if (existing.creatorEmail !== req.user!.email) {
    res.status(403).json({ message: "You can only delete your own events" });
    return;
  }

  await events.deleteOne({ _id, creatorEmail: req.user!.email });
  await joins.deleteMany({ eventId: _id });
  res.json({ message: "Event deleted" });
});

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

// Events the logged-in user has joined, sorted by event date (Joined Events page)
router.get("/my-joined", verifyJWT, async (req, res) => {
  const { joins } = await getCollections();

  const list = await joins
    .aggregate([
      { $match: { userEmail: req.user!.email } },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$event",
              {
                joinedAt: "$joinedAt",
                hasPassed: { $lt: ["$event.eventDate", startOfToday()] },
              },
            ],
          },
        },
      },
      { $sort: { eventDate: 1 } },
    ])
    .toArray();

  res.json(list);
});

export default router;