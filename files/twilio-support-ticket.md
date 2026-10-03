# Twilio support ticket — SMS to Colombia marked "delivered" but never reaches the handset

**Account:** the account this ticket is filed from (Full, active)
**From:** +15186560966 (US local long code, SMS enabled)
**To:** +573207145752 (Colombian mobile, confirmed active and in the owner's hands)

## Summary

Every message we send to this Colombian mobile is accepted, **billed**, and reported
`delivered` by Twilio within 1–2 seconds. **None of them ever arrives on the handset.** The
owner has the phone in hand during each test, has checked the spam / unknown-sender folders,
and receives SMS from other services normally. No error code is returned on any message.

## Message SIDs

| SID | Date (UTC) | Segments | Encoding | Price | Status | Error | Received? |
|---|---|---|---|---|---|---|---|
| SMdb43f3aa198c49a96d6cc2d9aebe5984 | 2026-09-27 00:08 | 2 | UCS-2 | -0.1184 | delivered | none | No |
| SM746535ec215a6b3f799b8ec0d8bcea12 | 2026-09-27 00:09 | 2 | UCS-2 | — | delivered | none | No |
| SMbd1d8aafe556fd00cdb450188f7c9fae | 2026-09-27 00:11 | 2 | UCS-2 | — | delivered | none | No |
| SM2383dd08d69dafd71d679f7202e57847 | 2026-10-03 16:25 | 1 | GSM-7 | -0.0592 | delivered | none | No |
| SM87ad05002bddf3d0a442d0db4bdd32c2 | 2026-10-03 16:43 | 1 | GSM-7 | -0.0592 | delivered | none | No |

## What we already ruled out

- **Our application.** SM2383dd08… was sent straight from the REST API with no application
  involved, with plain ASCII text. Same result.
- **Encoding and segmentation.** The first three were 2-segment UCS-2 (em dash and accents).
  We normalised everything to GSM-7 and sent single segments with `SmartEncoded=true`
  (SM87ad0500…). Same result.
- **Account state.** The account is Full and active, not trial, so there is no verified-caller
  restriction.
- **Geo permissions.** Colombia is enabled; a disabled country returns 21408, and we never see it.
- **Content.** The plain test ("Prueba directa Twilio. Si recibes este mensaje, responde OK.")
  has no links, no promotional wording and no unusual characters.
- **The handset.** The owner confirms the number is theirs, active, and receiving other SMS.

## What we are asking

1. Please trace these SIDs with the downstream carrier and tell us what the Colombian operator
   actually did with them. The DLRs we receive say `delivered`, which does not match reality.
2. If the route is filtering automated traffic from an international long code, please say so
   plainly, so we can stop paying for messages that cannot arrive.
3. What is the supported path for reaching Colombian and Peruvian mobiles with
   emergency-drill notifications that need a reply? Your own country guidelines say Colombian
   domestic long codes are not supported, Colombian alphanumeric sender IDs are not supported,
   Colombian short codes take 4–10 weeks, and Peru has no two-way SMS at all. We would like a
   recommendation for this use case before committing to a provisioning path.

## Use case, for context

An emergency-operations drill platform for a public-sector client. During a drill each
participant receives a message explicitly marked as a drill (`SIMULACRO MetaMAP — no es una
emergencia real`), then a welfare check asking them to reply SI or NO, and one reminder if they
do not answer. Recipients are staff who gave written consent. Volume is low: a handful of
messages per participant per drill. An A2P 10DLC campaign for the US is registered separately
and is not involved in this traffic.
