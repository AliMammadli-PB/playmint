"use client";

import { useState } from "react";
import { slugify } from "@/lib/catalog";

type Opt = { value: string; label: string };
export type MetaLabels = {
  title: string;
  slug: string;
  slugHint: string;
  category: string;
  tagline: string;
  description: string;
  langTabs: string;
  tags: string;
  license: string;
  orientation: string;
  cover: string;
  premium: string;
};
export type MetaDefaults = {
  title?: string;
  slug?: string;
  category?: string;
  tagline?: Record<string, string | undefined>;
  description?: Record<string, string | undefined>;
  tags?: string[];
  license?: string;
  orientation?: string;
  premiumOnly?: boolean;
};

export function GameMetaFields({
  labels,
  categories,
  licenses,
  orientations,
  defaults = {},
  slugLocked = false,
}: {
  labels: MetaLabels;
  categories: Opt[];
  licenses: Opt[];
  orientations: Opt[];
  defaults?: MetaDefaults;
  slugLocked?: boolean;
}) {
  const [title, setTitle] = useState(defaults.title ?? "");
  const [slug, setSlug] = useState(defaults.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!defaults.slug);
  const [lang, setLang] = useState<"tr" | "az" | "en">("tr");

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">{labels.title}</label>
          <input
            id="title"
            name="title"
            required
            maxLength={60}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched && !slugLocked) setSlug(slugify(e.target.value));
            }}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="slug">{labels.slug}</label>
          <input
            id="slug"
            name="slug"
            required
            readOnly={slugLocked}
            pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className={`input font-mono ${slugLocked ? "opacity-60" : ""}`}
          />
          <p className="hint">{labels.slugHint}</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Select name="category" label={labels.category} options={categories} defaultValue={defaults.category} />
        <Select name="license" label={labels.license} options={licenses} defaultValue={defaults.license ?? "MIT"} />
        <Select name="orientation" label={labels.orientation} options={orientations} defaultValue={defaults.orientation ?? "landscape"} />
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full bg-ink-2 p-1">
            {(["tr", "az", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${lang === l ? "bg-mint text-ink" : "text-muted"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-faint">{labels.langTabs}</span>
        </div>
        {(["tr", "az", "en"] as const).map((l) => (
          <div key={l} className={lang === l ? "space-y-4" : "hidden"}>
            <div>
              <label className="label" htmlFor={`tagline_${l}`}>{labels.tagline} ({l.toUpperCase()})</label>
              <input id={`tagline_${l}`} name={`tagline_${l}`} required={l === "tr"} maxLength={120} defaultValue={defaults.tagline?.[l]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={`description_${l}`}>{labels.description} ({l.toUpperCase()})</label>
              <textarea id={`description_${l}`} name={`description_${l}`} rows={5} maxLength={4000} defaultValue={defaults.description?.[l]} className="input" />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="tags">{labels.tags}</label>
        <input id="tags" name="tags" maxLength={200} defaultValue={defaults.tags?.join(", ")} className="input" placeholder="pixel, retro, 2d" />
      </div>
      <div>
        <label className="label" htmlFor="cover">{labels.cover}</label>
        <input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" className="input file:mr-3 file:rounded-full file:border-0 file:bg-surface-3 file:px-3 file:py-1 file:text-paper" />
      </div>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="premiumOnly" defaultChecked={defaults.premiumOnly} className="h-4 w-4 accent-[#ffc857]" />
        <span><span className="text-amber">★</span> {labels.premium}</span>
      </label>
    </div>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: Opt[]; defaultValue?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} required defaultValue={defaultValue ?? ""} className="input">
        <option value="" disabled>—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
