-- MetaMAP national-emergency alerts: sent messages and inbound replies.
-- Both tables are written only by the Edge Functions (service role). No public access.

create table if not exists metamap_sms_sent (
  id            bigserial primary key,
  emergency_id  text        not null default '',
  to_number     text        not null,
  kind          text        not null,              -- alert · welfare · remind · ack
  body          text        not null,
  twilio_sid    text,
  status        text        not null default 'queued',
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
create index if not exists metamap_sms_replies_eid_idx on metamap_sms_replies (emergency_id, received_at);

alter table metamap_sms_sent    enable row level security;
alter table metamap_sms_replies enable row level security;
-- no policies: the service role bypasses RLS, everyone else is denied
