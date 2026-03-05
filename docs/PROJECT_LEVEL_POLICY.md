# Project Level -> Cron Cadence Policy

## Levels
- L1 (Critical/P1): `*/10 * * * *`
- L2 (Active): `*/30 * * * *`
- L3 (Stable/Maintenance): `0 */3 * * *`
- L4 (Backlog/Paused): `0 9 * * *`

## Auto-escalation triggers (Burst)
When one of the following is detected, temporarily raise to Burst cadence (10-20m for 2h):
- incident
- approval_overdue
- test_fail

After 2h and no trigger recurrence, revert to baseline cadence by level.

## API
- `POST /api/project-controls`
- `GET /api/project-controls`
- `PATCH /api/project-controls/{id}`
