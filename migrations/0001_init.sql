CREATE TABLE subscriptions (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  category                TEXT NOT NULL
                            CHECK (category IN ('streaming','software','fitness','hosting_domains','other')),
  amount                  REAL NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'CZK',
  billing_cycle           TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly','weekly')),
  next_renewal_date       TEXT NOT NULL,
  url                     TEXT,
  notes                   TEXT,
  is_active               INTEGER NOT NULL DEFAULT 1,
  last_used_at            TEXT,
  last_reminder_sent_for  TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

CREATE TABLE renewal_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  renewed_at      TEXT NOT NULL,
  amount          REAL NOT NULL,
  currency        TEXT NOT NULL
);

CREATE INDEX idx_subscriptions_category ON subscriptions(category);
CREATE INDEX idx_subscriptions_next_renewal ON subscriptions(next_renewal_date);
CREATE INDEX idx_renewal_events_sub ON renewal_events(subscription_id);
