import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { db, schema } from "@/lib/db";
import { listGames } from "@/lib/games";
import { GameGrid } from "@/components/GameCard";

export default async function DeveloperProfile({ params }: PageProps<"/[locale]/u/[handle]">) {
  const { locale, t } = await resolveLocale(params);
  const { handle } = await params;
  const dev = (await db.select().from(schema.developerProfiles).where(eq(schema.developerProfiles.handle, handle)).limit(1))[0];
  if (!dev) notFound();
  const games = await listGames({ developerId: dev.userId, sort: "popular", limit: 60 });
  const website = /^https?:\/\//.test(dev.website) ? dev.website : "";
  return (
    <div className="container-pm py-10">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 font-display text-2xl font-bold text-mint">
          {dev.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="h1">{dev.displayName}</h1>
          <p className="text-sm text-muted">
            @{dev.handle}
            {website && (
              <>
                {" · "}
                <a href={website} target="_blank" rel="noreferrer nofollow" className="hover:text-mint">
                  {website.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      {dev.bio && <p className="mt-5 max-w-2xl whitespace-pre-line text-muted">{dev.bio}</p>}
      <div className="mt-10">
        {games.length ? <GameGrid games={games} locale={locale} t={t} /> : <div className="card p-10 text-center text-muted">{t.browse.empty}</div>}
      </div>
    </div>
  );
}
