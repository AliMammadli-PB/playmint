"use client";

import { useActionState } from "react";
import { updateGameAction, type EditState } from "./actions";
import { GameMetaFields, type MetaDefaults, type MetaLabels } from "@/components/GameMetaFields";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

type Opt = { value: string; label: string };

export function EditGameForm({
  gameId,
  locale,
  fields,
  defaults,
  saveLabel,
  savedLabel,
}: {
  gameId: string;
  locale: string;
  fields: { labels: MetaLabels; categories: Opt[]; licenses: Opt[]; orientations: Opt[] };
  defaults: MetaDefaults;
  saveLabel: string;
  savedLabel: string;
}) {
  const [state, action] = useActionState<EditState, FormData>(updateGameAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="gameId" value={gameId} />
      <GameMetaFields {...fields} defaults={defaults} />
      <FormError message={state?.error} />
      {state?.ok && <FormSuccess message={savedLabel} />}
      <SubmitButton>{saveLabel}</SubmitButton>
    </form>
  );
}
