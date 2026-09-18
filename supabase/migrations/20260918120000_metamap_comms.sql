-- MetaMAP communications: national-emergency SMS and the daily report email.
-- The two SMS tables are the vendor's (server/supabase/schema.sql); metamap_report_sent
-- and the replies-by-number index support duplicate suppression in metamap/api/*.
-- Only the Vercel functions write here, with the service key: RLS on, no policies.

create table if not exists metamap_sms_sent (
  id            bigserial primary key,
  emergency_id  text        not null default '',
  to_number     text        not null,
  kind          text        not null,              -- alert · welfare · remind · ack
  body          text        not null,
  twilio_sid    text,
  status        text        not null default 'queued',  -- Twilio status · failed · suppressed
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists metamap_sms_sent_to_idx  on metamap_sms_sent (to_number, created_at desc);
create index if not exists metamap_sms_sent_eid_idx on metamap_sms_sent (emergency_id);

create table if not exists metamap_sms_replies (
  id            bigserial primary key,
  emergency_id  text        not null default '',
  from_number   text        not null,
  body          text        not null,
  received_at   timestamptz not null default now()
);
create index if not exists metamap_sms_replies_eid_idx  on metamap_sms_replies (emergency_id, received_at);
create index if not exists metamap_sms_replies_from_idx on metamap_sms_replies (from_number, received_at desc);

create table if not exists metamap_report_sent (
  id            bigserial primary key,
  recipients    text        not null,              -- sorted, comma-joined
  subject       text        not null,
  resend_id     text,
  status        text        not null,              -- sent · failed · suppressed
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists metamap_report_sent_dedupe_idx on metamap_report_sent (subject, recipients, created_at desc);

alter table metamap_sms_sent    enable row level security;
alter table metamap_sms_replies enable row level security;
alter table metamap_report_sent enable row level security;
