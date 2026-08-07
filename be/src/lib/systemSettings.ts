import { db } from "./db";

// Singleton row — always the same fixed id, upserted in place rather than
// having a real multi-row settings table (there's exactly one system-wide
// toggle, not per-user preferences).
const SETTINGS_ID = "singleton";

export type SystemSettings = {
  isPublic: boolean;
  accessCode: string | null;
};

/** Falls back to the schema defaults (private, no code) if the row hasn't been created yet. */
export async function getSystemSettings(): Promise<SystemSettings> {
  const row = await db.systemSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row ? { isPublic: row.isPublic, accessCode: row.accessCode } : { isPublic: false, accessCode: null };
}

/** Partial update — omitted fields are left untouched (Prisma ignores `undefined` in `update`). */
export async function updateSystemSettings(data: { isPublic?: boolean; accessCode?: string }): Promise<SystemSettings> {
  const row = await db.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, isPublic: data.isPublic ?? false, accessCode: data.accessCode ?? null },
    update: data,
  });
  return { isPublic: row.isPublic, accessCode: row.accessCode };
}
