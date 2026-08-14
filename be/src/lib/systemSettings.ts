import { db } from "./db";

// Singleton row — always the same fixed id, upserted in place rather than
// having a real multi-row settings table (there's exactly one system-wide
// toggle, not per-user preferences).
const SETTINGS_ID = "singleton";

const DEFAULT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GiB
const DEFAULT_HOME_SLIDE_INTERVAL_SEC = 5;

export type SystemSettings = {
  isPublic: boolean;
  accessCode: string | null;
  storageQuotaBytes: number;
  homeSlideIntervalSec: number;
};

const DEFAULTS: SystemSettings = {
  isPublic: false,
  accessCode: null,
  storageQuotaBytes: DEFAULT_STORAGE_QUOTA_BYTES,
  homeSlideIntervalSec: DEFAULT_HOME_SLIDE_INTERVAL_SEC,
};

function toSettings(row: {
  isPublic: boolean;
  accessCode: string | null;
  storageQuotaBytes: number;
  homeSlideIntervalSec: number;
}): SystemSettings {
  return {
    isPublic: row.isPublic,
    accessCode: row.accessCode,
    storageQuotaBytes: row.storageQuotaBytes,
    homeSlideIntervalSec: row.homeSlideIntervalSec,
  };
}

/** Falls back to the schema defaults if the row hasn't been created yet. */
export async function getSystemSettings(): Promise<SystemSettings> {
  const row = await db.systemSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row ? toSettings(row) : DEFAULTS;
}

/** Partial update — omitted fields are left untouched (Prisma ignores `undefined` in `update`). */
export async function updateSystemSettings(data: {
  isPublic?: boolean;
  accessCode?: string;
  storageQuotaBytes?: number;
  homeSlideIntervalSec?: number;
}): Promise<SystemSettings> {
  const row = await db.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      isPublic: data.isPublic ?? DEFAULTS.isPublic,
      accessCode: data.accessCode ?? DEFAULTS.accessCode,
      storageQuotaBytes: data.storageQuotaBytes ?? DEFAULTS.storageQuotaBytes,
      homeSlideIntervalSec: data.homeSlideIntervalSec ?? DEFAULTS.homeSlideIntervalSec,
    },
    update: data,
  });
  return toSettings(row);
}
