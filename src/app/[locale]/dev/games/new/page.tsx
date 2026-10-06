import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { getSettings } from "@/lib/settings";
import { metaFieldProps, uploadLabels } from "@/lib/i18n/forms";
import { UploadForm } from "@/components/UploadForm";
import { GameMetaFields } from "@/components/GameMetaFields";
import { ZipFields } from "../ZipFields";

export default async function NewGame({ params }: PageProps<"/[locale]/dev/games/new">) {
  const { locale, t } = await resolveLocale(params);
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="h1">{t.dev.newTitle}</h1>
      <div className="card p-6">
        <UploadForm
          endpoint="/api/dev/games"
          redirectTo={`/${locale}/dev/games/{gameId}`}
          submitLabel={t.dev.submitNew}
          labels={uploadLabels(t)}
        >
          <input type="hidden" name="locale" value={locale} />
          <GameMetaFields {...metaFieldProps(t)} />
          <ZipFields
            labels={{ zip: fill(t.dev.fZip, { mb: s.maxZipMb }), zipHint: t.dev.fZipHint, changelog: t.dev.fChangelog, openSource: t.dev.fOpenSource }}
            maxMb={s.maxZipMb}
          />
        </UploadForm>
      </div>
    </div>
  );
}
