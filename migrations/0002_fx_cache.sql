CREATE TABLE fx_rates_cache (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  rates_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
