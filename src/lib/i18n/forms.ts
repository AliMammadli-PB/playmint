import type { Dict } from "@/lib/i18n";
import { categories, licenses } from "@/lib/catalog";
import { categoryEmoji } from "@/lib/catalog";

export function metaFieldProps(t: Dict) {
  return {
    labels: {
      title: t.dev.fTitle,
      slug: t.dev.fSlug,
      slugHint: t.dev.fSlugHint,
      category: t.dev.fCategory,
      tagline: t.dev.fTagline,
      description: t.dev.fDescription,
      langTabs: t.dev.fLangTabs,
      tags: t.dev.fTags,
      license: t.dev.fLicense,
      orientation: t.dev.fOrientation,
      cover: t.dev.fCover,
      premium: t.dev.fPremium,
    },
    categories: categories.map((c) => ({ value: c, label: `${categoryEmoji[c]} ${t.categories[c]}` })),
    licenses: licenses.map((l) => ({ value: l.id, label: l.id })),
    orientations: (["landscape", "portrait", "any"] as const).map((o) => ({ value: o, label: t.dev.orientation[o] })),
  };
}

export function uploadLabels(t: Dict) {
  return { uploading: t.dev.uploading, processing: t.dev.processing, submitted: t.dev.submitted, error: t.common.error, tooBig:t.dev.errors.file_too_big };
}
