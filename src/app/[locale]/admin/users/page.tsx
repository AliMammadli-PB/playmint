import { desc, ilike, or, sql } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { date } from "@/lib/format";
import { StatusBadge } from "@/components/Kpi";
import { userAdminAction } from "../actions";

export default async function AdminUsers({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const { locale, t } = await resolveLocale(params);
  const me = await getCurrentUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const like = `%${q}%`;
  const users = await db
    .select({
      u: schema.users,
      premiumUntil: sql<Date | null>`(select max(current_period_end) from subscriptions s where s.user_id = ${schema.users.id} and s.status = 'active' and s.current_period_end > now())`,
    })
    .from(schema.users)
    .where(q ? or(ilike(schema.users.email, like), ilike(schema.users.name, like)) : undefined)
    .orderBy(desc(schema.users.createdAt))
    .limit(200);
  const Btn = ({ userId, op, label, danger = false }: { userId: string; op: string; label: string; danger?: boolean }) => (
    <form action={userAdminAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="op" value={op} />
      <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-ghost"}`}>{label}</button>
    </form>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{t.admin.usersTitle}</h1>
        <form className="w-full max-w-xs">
          <input name="q" defaultValue={q} placeholder={t.admin.searchUsers} className="input rounded-full" />
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-pm">
          <thead>
            <tr>
              <th>{t.auth.name}</th>
              <th>{t.admin.role}</th>
              <th>{t.common.premium}</th>
              <th>{t.admin.joined}</th>
              <th>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(({ u, premiumUntil }) => (
              <tr key={u.id}>
                <td>
                  <div className="font-semibold">{u.name} {u.banned && <StatusBadge tone="danger">banned</StatusBadge>}</div>
                  <div className="text-xs text-faint">{u.email}</div>
                </td>
                <td>
                  <form action={userAdminAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="op" defaultValue={`role:${u.role}`} disabled={u.id === me?.id} className="input w-auto py-1 text-xs">
                      {(["player", "developer", "admin"] as const).map((r) => (
                        <option key={r} value={`role:${r}`}>{t.admin.roles[r]}</option>
                      ))}
                    </select>
                    {u.id !== me?.id && <button className="btn btn-ghost btn-sm">✓</button>}
                  </form>
                </td>
                <td className="text-xs">{premiumUntil ? <span className="text-amber">★ {date(premiumUntil, locale)}</span> : "—"}</td>
                <td className="text-xs text-muted">{date(u.createdAt, locale)}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <Btn userId={u.id} op="grant" label={t.admin.grantPremium} />
                    {u.id !== me?.id && <Btn userId={u.id} op={u.banned ? "unban" : "ban"} label={u.banned ? t.admin.unban : t.admin.ban} danger={!u.banned} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
