import { z } from "zod";

export const EVENT_TYPES = [
  "Cleanup",
  "Plantation",
  "Donation",
  "Food Distribution",
  "Health Camp",
  "Education",
  "Other",
] as const;

const DHAKA_OFFSET_HOURS = 6; // Asia/Dhaka is UTC+6, no daylight saving

// Start of "today" in Dhaka, expressed as a UTC-midnight Date.
export function startOfToday(): Date {
  const d = new Date(Date.now() + DHAKA_OFFSET_HOURS * 60 * 60 * 1000);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const futureDate = z.coerce
  .date({ error: "Please provide a valid date" })
  .refine((d) => d.getTime() >= startOfToday().getTime(), {
    message: "Event date must be today or in the future",
  });

export const createEventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(2000),
  eventType: z.enum(EVENT_TYPES, { error: "Choose a valid event type" }),
  thumbnail: z.string().trim().url("Thumbnail must be a valid image URL"),
  location: z.string().trim().min(3, "Location is required").max(160),
  eventDate: futureDate,
});

// For updates, every field becomes optional
export const updateEventSchema = createEventSchema.partial();

export const objectIdRegex = /^[a-f\d]{24}$/i;

// Stops users from injecting regex characters into search
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");