<!-- search-meta
tags: [REST-API, user-management, multi-org, org-admin, Python, automation]
apis: [users/{user_identifier}/update, org_identifiers, auth/token/full, orgs/search, users/search, searchdata, REST-API-v2]
questions:
  - How do I remove inactive users from a specific ThoughtSpot org without deleting them from the cluster?
  - How do I automate org membership cleanup based on user inactivity?
  - How do I remove a user from one org while keeping them in their other orgs?
  - How do I determine per-org user activity in ThoughtSpot using the BI Server usage data?
-->

# ts-org-inactive-users-cleanup.py

Removes users from the specified ThoughtSpot org after N days of inactivity in
that org. Users stay on the cluster and in their other orgs — only
membership in that one org is removed. Run once per org.

## Requirements

- Python 3.9+, `pip3 install -r requirements.txt`
- `TS: BI Server` usage-stats reporting enabled on your cluster (what the
  inactivity check is based on).
- An account with **"Can administer Org"** rights on the org you're
  processing, via one of:
  - **Trusted Auth `secret_key`** — can be org-scoped on some deployments
    — if you'll run this against several orgs, you may need a different
    key per org.
  - **Username + password** — simpler across several orgs, since one
    account's password works for every org it administers.

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r requirements.txt
```

Every run below follows the same three steps, in this order:
**list orgs → dry run → live run**. Always review the dry-run CSV before
going live. Pick one of the two approaches below for supplying
credentials/target org — don't mix them for the same run.

## Approach A: `.env` file (recommended)

Keeps `secret_key`/password out of your shell history and out of `ps`
output, which passing them as CLI flags would not.

```bash
cp .env.example .env
```

Open `.env` and fill in `TS_CLUSTER_URL`, **one** of the two auth methods
above, and `TS_ORG_ID` (find it with step 1 below if you don't have it
yet). `.env` is gitignored — never commit your real one.

```bash
# 1. Find your org ID (skip if you already know it)
python3 ts-org-inactive-users-cleanup.py --list-orgs

# 2. Dry run — no changes made, writes ts_org_cleanup_audit_<org_id>.csv
python3 ts-org-inactive-users-cleanup.py --dry-run

# 3. Live run — same command, minus --dry-run. No confirmation prompt
#    (deliberate, so this can run unattended on a schedule/cron).
python3 ts-org-inactive-users-cleanup.py
```

## Approach B: CLI flags (no `.env` file)

Every value normally read from `.env` has a matching flag instead. Useful
for a one-off run, or when credentials come from another secrets store
that injects them as arguments.

```bash
# 1. Find your org ID (skip if you already know it)
python3 ts-org-inactive-users-cleanup.py \
    --cluster-url https://your-cluster.thoughtspot.cloud \
    --username <admin_user> --password '<admin_password>' \
    --list-orgs

# 2. Dry run — no changes made, writes ts_org_cleanup_audit_111.csv
python3 ts-org-inactive-users-cleanup.py \
    --cluster-url https://your-cluster.thoughtspot.cloud \
    --username <admin_user> --password '<admin_password>' \
    --org-id 111 --dry-run

# 3. Live run — same command, minus --dry-run.
python3 ts-org-inactive-users-cleanup.py \
    --cluster-url https://your-cluster.thoughtspot.cloud \
    --username <admin_user> --password '<admin_password>' \
    --org-id 111
```

(Swap `--username`/`--password` for `--secret-key '<key>' --admin-username <user>`
if you're using Trusted Auth instead of a password.)

Mixing is allowed but resolves by precedence — see **Optional flags**
below: a real exported env var or an explicit CLI flag always takes
priority over `.env`.

## Multiple orgs?

Run the script again with a different `--org-id` (this overrides whatever
`TS_ORG_ID` is set in `.env`) — each run is independent, and its audit
CSV/log file is named after that org's ID
(`ts_org_cleanup_audit_<org_id>.csv`), so runs never overwrite each other.

## Optional flags

| Flag | `.env` equivalent | What it does |
|---|---|---|
| `--cluster-url <url>` | `TS_CLUSTER_URL` | ThoughtSpot cluster base URL |
| `--secret-key '<key>'` | `TS_SECRET_KEY` | Trusted Auth key (Method 1) |
| `--admin-username <user>` | `TS_ADMIN_USERNAME` | Username to mint tokens as (used with `--secret-key`) |
| `--username <user>` | `TS_USERNAME` | Admin username for password auth (Method 2) |
| `--password '<password>'` | `TS_PASSWORD` | Admin password for password auth (Method 2) |
| `--org-id 111` | `TS_ORG_ID` | The org to process |
| `--inactivity-days 30` | — | Inactivity threshold (default: 10 days) |
| `--list-orgs` | — | List every org's id + name, then exit |

## Notes

- A live run (no `--dry-run`) removes users immediately with **no
  confirmation prompt** — this is intentional, so the script can be
  scheduled (cron/etc.) without a `yes` prompt blocking unattended runs.
  Always dry-run first.
- Never removes `tsadmin`, `system`, or `thoughtspot` accounts.
- The startup banner states exactly which auth method and source (CLI
  flag, a real env var, or `.env` file) is active — check it if a run
  doesn't behave as expected. A stale `TS_SECRET_KEY` in your shell or
  left in `.env` from an earlier setup silently overrides CLI flags
  otherwise.
