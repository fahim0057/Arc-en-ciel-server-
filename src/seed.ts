import "dotenv/config";
import { getCollections } from "./config/db";

// Returns UTC midnight, n days from today (negative = in the past)
const day = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const SEED_EMAIL = "seed@example.com";

const base = {
  creatorEmail: SEED_EMAIL,
  creatorName: "Community Team",
  createdAt: new Date(),
};

// Replace the thumbnails with real image URLs before you submit.
const sampleEvents = [
  {
    title: "Winter Clothes Distribution",
    eventType: "Donation",
    location: "Mirpur 10, Dhaka",
    eventDate: day(5),
    description:
      "Help us hand out warm clothes to families who need them most this winter. Volunteers will sort and distribute donated clothing.",
    thumbnail: "https://picsum.photos/seed/winter/800/450",
  },
  {
    title: "Blanket Distribution for the Needy",
    eventType: "Donation",
    location: "Mohammadpur, Dhaka",
    eventDate: day(9),
    description:
      "Join us as we deliver blankets to street dwellers and low-income households during the coldest nights of the season.",
    thumbnail: "https://picsum.photos/seed/blanket/800/450",
  },
  {
    title: "Dhanmondi Lake Cleanup",
    eventType: "Cleanup",
    location: "Dhanmondi Lake, Dhaka",
    eventDate: day(12),
    description:
      "A morning of collecting plastic and waste around the lake. Gloves and bags are provided by the organizers.",
    thumbnail: "https://picsum.photos/seed/lake/800/450",
  },
  {
    title: "Tree Plantation Drive",
    eventType: "Plantation",
    location: "Hatirjheel, Dhaka",
    eventDate: day(15),
    description:
      "Plant native saplings with us and help make the city greener. No experience needed, just bring your energy.",
    thumbnail: "https://picsum.photos/seed/trees/800/450",
  },
  {
    title: "Free Health Checkup Camp",
    eventType: "Health Camp",
    location: "Uttara Sector 7, Dhaka",
    eventDate: day(20),
    description:
      "Volunteer doctors offer free blood pressure, sugar and general health screening for local residents.",
    thumbnail: "https://picsum.photos/seed/health/800/450",
  },
  {
    title: "Street Children Study Support",
    eventType: "Education",
    location: "Farmgate, Dhaka",
    eventDate: day(24),
    description:
      "Spend an afternoon tutoring children and distributing books and stationery in a friendly learning space.",
    thumbnail: "https://picsum.photos/seed/study/800/450",
  },
  {
    title: "Meal Packs for Day Laborers",
    eventType: "Food Distribution",
    location: "Old Dhaka",
    eventDate: day(28),
    description:
      "Pack and distribute meal boxes to day laborers and rickshaw pullers in Old Dhaka.",
    thumbnail: "https://picsum.photos/seed/food/800/450",
  },
  // A past event on purpose: it must NOT appear in any public list.
  {
    title: "Past Event (should be hidden)",
    eventType: "Cleanup",
    location: "Test Location, Dhaka",
    eventDate: day(-10),
    description:
      "This event is in the past and exists only to prove the upcoming filter works correctly.",
    thumbnail: "https://picsum.photos/seed/past/800/450",
  },
];

async function seed() {
  const { events } = await getCollections();

  // Remove earlier seed data so running the script twice doesn't create duplicates
  const removed = await events.deleteMany({ creatorEmail: SEED_EMAIL });
  console.log(`Removed ${removed.deletedCount} old seed events`);

  const result = await events.insertMany(sampleEvents.map((e) => ({ ...base, ...e })));
  console.log(`Inserted ${result.insertedCount} events`);
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());