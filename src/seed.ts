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
    thumbnail: "https://basmah.org/wp-content/uploads/2025/12/winter-2025-12-08-1.jpg",
  },
  {
    title: "Blanket Distribution for the Needy",
    eventType: "Donation",
    location: "Mohammadpur, Dhaka",
    eventDate: day(9),
    description:
      "Join us as we deliver blankets to street dwellers and low-income households during the coldest nights of the season.",
    thumbnail: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Winter_Clothes_Distribution_Among_Orphans_of_Yatimkhana_of_Bangladesh_by_Needy_Foundation._05.jpg/960px-Winter_Clothes_Distribution_Among_Orphans_of_Yatimkhana_of_Bangladesh_by_Needy_Foundation._05.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20221110181845",
  },
  {
    title: "Dhanmondi Lake Cleanup",
    eventType: "Cleanup",
    location: "Dhanmondi Lake, Dhaka",
    eventDate: day(12),
    description:
      "A morning of collecting plastic and waste around the lake. Gloves and bags are provided by the organizers.",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/2/23/Dhanmondi_Lake_02.jpg?utm_source=en.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
  },
  {
    title: "Tree Plantation Drive",
    eventType: "Plantation",
    location: "Hatirjheel, Dhaka",
    eventDate: day(15),
    description:
      "Plant native saplings with us and help make the city greener. No experience needed, just bring your energy.",
    thumbnail: "https://ecdn.dhakatribune.net/contents/cache/images/1100x618x1/uploads/media/2026/06/13/9fb24249310b9d5d6b8d6d1e9139fb82-6a2d26613b72d.jpg?jadewits_media_id=67661",
  },
  {
    title: "Free Health Checkup Camp",
    eventType: "Health Camp",
    location: "Uttara Sector 7, Dhaka",
    eventDate: day(20),
    description:
      "Volunteer doctors offer free blood pressure, sugar and general health screening for local residents.",
    thumbnail: "https://ecdn.dhakatribune.net/contents/cache/images/1100x618x1/uploads/media/2025/01/28/rsz_img_20250128_122503-9d5c644e2df83153f49264a7948429e4.jpg?jadewits_media_id=38335",
  },
  {
    title: "Street Children Study Support",
    eventType: "Education",
    location: "Farmgate, Dhaka",
    eventDate: day(24),
    description:
      "Spend an afternoon tutoring children and distributing books and stationery in a friendly learning space.",
    thumbnail: "https://scontent.fdac134-1.fna.fbcdn.net/v/t39.30808-6/706317333_1442001297966419_4342276047430077765_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1440&ctp=s1080x1440&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=PLq9HwG88_oQ7kNvwG1JFyq&_nc_oc=AdqiTi3hLkE-QBOMDYM9zkQ2jfTmduHxc6C8m9KvuNIwKg4jdNt3bLZdayOijiPQb6U&_nc_zt=23&_nc_ht=scontent.fdac134-1.fna&_nc_gid=lb5PLjPDy1pc-15qqihtTA&_nc_ss=7b289&oh=00_AQQd__-PYJNeOqTGVOjYBh_R42eDttM3DAVGsEGmslNXog&oe=6AF134CD",
  },
  {
    title: "Meal Packs for Day Laborers",
    eventType: "Food Distribution",
    location: "Old Dhaka",
    eventDate: day(28),
    description:
      "Pack and distribute meal boxes to day laborers and rickshaw pullers in Old Dhaka.",
    thumbnail: "https://scontent.fdac134-1.fna.fbcdn.net/v/t39.30808-6/844978879_2257303001715721_3473390792946912912_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=TG19Ro6U16MQ7kNvwFS4Y7D&_nc_oc=AdrLZ_NpCrMTDkNhKtuv-nraZFCc2xe6csC-_H6FCvNdnTuJatby2XzbLk-7W1VkmsA&_nc_zt=23&_nc_ht=scontent.fdac134-1.fna&_nc_gid=6O7yqwE4mcf2UExi7r497A&_nc_ss=7b289&oh=00_AQSCSqxSRvGOLUvArGHdQjYemyCj3DVWHyVUoWDL3O9W4w&oe=6AF11BE4",
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