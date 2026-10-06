/** Usage: pnpm admin:promote someone@example.com */
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const email = (process.argv[2] ?? "").toLowerCase();
db.update(schema.users)
  .set({ role: "admin" })
  .where(eq(schema.users.email, email))
  .returning({ id: schema.users.id })
  .then((r) => {
    console.log(r.length ? `${email} is now admin` : `no user ${email}`);
    process.exit(0);
  });
