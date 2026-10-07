export function ZipFields({
  labels,
  maxMb,
  showChangelog = false,
  requireOpenSource=true,
}: {
  labels: { zip: string; zipHint: string; changelog: string; openSource: string };
  maxMb: number;
  showChangelog?: boolean;
  requireOpenSource?:boolean;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-dashed border-mint/40 bg-mint/[0.03] p-5">
      <div>
        <label className="label" htmlFor="zip">📦 {labels.zip}</label>
        <input
          id="zip"
          name="zip"
          type="file"
          required
          accept=".zip,application/zip,application/x-zip-compressed"
          data-max-mb={maxMb}
          className="input file:mr-3 file:rounded-full file:border-0 file:bg-mint file:px-3 file:py-1 file:font-semibold file:text-ink"
        />
        <p className="hint">{labels.zipHint}</p>
      </div>
      {showChangelog && (
        <div>
          <label className="label" htmlFor="changelog">{labels.changelog}</label>
          <textarea id="changelog" name="changelog" rows={3} maxLength={2000} className="input" />
        </div>
      )}
      {requireOpenSource&&<label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="openSource" required className="mt-0.5 h-4 w-4 accent-[#3dffb0]" />
        <span>{labels.openSource}</span>
      </label>}
    </div>
  );
}
