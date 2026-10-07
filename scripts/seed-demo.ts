/**
 * Prepare unpublished internal demo games under the "Playmint Studio" account (idempotent).
 * Usage: pnpm seed:demo
 */
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { newId, randomToken } from "@/lib/ids";
import { hashPassword } from "@/lib/password";
import { createVersion, approveVersion } from "@/lib/versions";

const demos = [
  {
    slug: "neon-snake",
    title: "Neon Snake",
    category: "arcade",
    featured: true,
    tags: ["retro", "snake", "neon"],
    tagline: { tr: "Neon ışıklı klasik yılan. Ye, büyü, kuyruğuna çarpma.", en: "Classic snake with a neon glow. Eat, grow, don't bite your tail.", az: "Neon işıqlı klassik ilan. Ye, böyü, quyruğuna toxunma." },
    description: { tr: "Ok tuşları / WASD veya kaydırma ile yön ver. Duvarlardan geçebilirsin; yem yedikçe hızlanırsın.", en: "Steer with arrow keys / WASD or swipe. Walls wrap around and you speed up as you eat.", az: "Ox düymələri / WASD və ya sürüşdürmə ilə idarə et. Divarlardan keçə bilərsən; yedikcə sürətlənirsən." },
  },
  {
    slug: "mint-hopper",
    title: "Mint Hopper",
    category: "casual",
    featured: true,
    tags: ["one-button", "flappy"],
    tagline: { tr: "Tek tuşla zıpla, borulardan geç, rekorunu kır.", en: "One button. Hop through the gaps. Beat your best.", az: "Bir düymə ilə tullan, borulardan keç, rekordunu qır." },
    description: { tr: "Dokun, tıkla veya Boşluk tuşuna bas.", en: "Tap, click or press Space.", az: "Toxun, klik et və ya Boşluq düyməsini bas." },
  },
  {
    slug: "merge-2048",
    title: "Merge 2048",
    category: "puzzle",
    featured: false,
    tags: ["2048", "numbers", "brain"],
    tagline: { tr: "Kareleri kaydır, aynı sayıları birleştir, 2048'e ulaş.", en: "Slide tiles, merge equal numbers, reach 2048.", az: "Kvadratları sürüşdür, eyni rəqəmləri birləşdir, 2048-ə çat." },
    description: { tr: "Ok tuşları veya kaydırma ile oyna.", en: "Play with arrow keys or swipe.", az: "Ox düymələri və ya sürüşdürmə ilə oyna." },
  },
];

async function main() {
  const email = "studio@playmint.tr";
  let studio = (await db.select().from(schema.users).where(eq(schema.users.email, email)))[0];
  if (!studio) {
    const id = newId();
    await db.insert(schema.users).values({ id, email, name: "Playmint Studio", role: "developer", passwordHash: await hashPassword(randomToken(24)) });
    studio = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
  }
  await db
    .insert(schema.developerProfiles)
    .values({ userId: studio.id, handle: "playmint", displayName: "Playmint Studio", bio: "Demo games bundled with Playmint. MIT licensed — fork them!" })
    .onConflictDoNothing();

  for (const d of demos) {
    const exists = (await db.select().from(schema.games).where(eq(schema.games.slug, d.slug)))[0];
    if (exists) {
      console.log(`skip ${d.slug}`);
      continue;
    }
    const gameId = newId();
    await db.insert(schema.games).values({
      id: gameId,
      developerId: studio.id,
      slug: d.slug,
      title: d.title,
      category: d.category,
      tags: d.tags,
      tagline: d.tagline,
      description: d.description,
      license: "MIT",
      featured: false,
      isDemo: true,
    });
    const zipPath = path.join(process.cwd(), "demo-games", `${d.slug}.zip`);
    const file = new File([await fs.readFile(zipPath)], `${d.slug}.zip`, { type: "application/zip" });
    const versionId = await createVersion(gameId, file, "Initial release", 50);
    // Internal fixtures stay pending; they never enter the public catalogue.
    console.log(`prepared internal demo ${d.slug}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
