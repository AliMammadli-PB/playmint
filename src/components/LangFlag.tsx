const codes: Record<string, string> = { tr: "tr", az: "az", en: "gb" };

export function LangFlag({ locale }: { locale: string }) {
  const code = codes[locale] ?? "xx";
  return <span className={`fi fi-${code}`} aria-hidden="true" />;
}
