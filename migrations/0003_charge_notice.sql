-- The day-of mail ("charged today") needs its own mark. last_reminder_sent_for already holds the
-- date the "renewing soon" mail went out for, which is the same date — reusing it would mean a
-- reminder sent three days earlier silenced the message on the day the money actually left.
ALTER TABLE subscriptions ADD COLUMN charge_notice_sent_for TEXT;
