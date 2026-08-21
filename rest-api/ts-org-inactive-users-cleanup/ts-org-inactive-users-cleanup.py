#!/usr/bin/env python3
"""
ts-org-inactive-users-cleanup.py
─────────────────────────────────────────────────────────────────────────────
Removes users from ONE ThoughtSpot org when they have been inactive in
THAT org for more than INACTIVITY_DAYS days. One run processes exactly one
org (--org-id) — deliberately not a list. secret_key can itself be
org-scoped on some deployments (see Auth below), so a single-org design
avoids ever needing more than one credential per run; for multiple orgs,
just run the script once per org.

Users remain on the cluster and in their other active orgs — this is purely
an org-scoped removal using:
  POST /api/rest/2.0/users/{user_id}/update
  {"org_identifiers": [org_id], "operation": "REMOVE"}

This is NOT the documented DELETE /tspublic/v1/user/{userid}?orgid={orgid}
endpoint — that one is blocked at the network edge (bare 405 from nginx,
never reaches the app) on at least one real ThoughtSpot Cloud tenant this
was tested against. The Admin UI itself doesn't use that endpoint either —
it does a full user-object PATCH via an internal, undocumented GraphQL
mutation, which isn't safe to imitate generically (wrong reconstruction of
any other field risks corrupting it).

It's also NOT POST /api/rest/2.0/orgs/{org_id}/update (updating the org's
user list instead of the user's org list) — that one returned a
false-positive 204 for a freshly-created org: HTTP success, but the user's
actual org membership never changed, confirmed by reading the user back
afterward via users/search. The users/{user_id}/update form above was
verified durable the same way. Both endpoints were suggested by
ThoughtSpot's own platform team after escalating; only this one held up
under an independent read-back check.

Inactivity signal: per-org activity is read from the built-in "TS: BI
Server" system worksheet (Org Id / User Id / Timestamp columns, one row per
query/liveboard-view event) via /api/rest/2.0/searchdata — NOT the users
API's last_login_time, which is cluster-wide (a user active daily in one
org but dormant for months in another still shows a recent last_login_time
there, because orgs can be switched without re-authenticating). A user is
"inactive in org X" if they have zero BI Server events in org X within the
inactivity window. Requires usage-stats reporting to be enabled on the
cluster. The worksheet's GUID (BI_SERVER_WORKSHEET_ID below) is the same on
every ThoughtSpot deployment — confirmed empirically across two different
clusters — so it's a fixed constant, not something you need to look up.

Auth: the users/{user_id}/update call above only works with a token SCOPED
      TO THAT SPECIFIC ORG — confirmed empirically (a token scoped to a
      different org, or a general "cluster admin" token whose own org
      context is elsewhere, does not reliably work for this call). So the
      script mints a token scoped to --org-id, via
      POST /api/rest/2.0/auth/token/full, using secret_key or
      username/password. The account behind those credentials needs "Can
      administer Org" (or ORG_ADMINISTRATION under RBAC) in --org-id
      specifically — not just be a generic cluster administrator.

      secret_key can ALSO be org-scoped on some deployments — a key copied
      from one org's Trusted Authentication settings can fail outright
      ("service secret code is not valid") for a different org_id, even
      with a valid admin username. If you hit that, get the key from
      --org-id's own Security Settings instead, or use --username/
      --password, which doesn't have this limitation.

      A leftover TS_SECRET_KEY env var from an earlier session
      SILENTLY outranks --username/--password/--secret-key on the command
      line (env var beats CLI flag in the precedence below) — this has
      caused real, hard-to-diagnose confusion. The startup banner logs
      exactly which auth method and source (CLI flag vs env var) is
      actually being used, and warns if a stale env var looks like it's
      overriding flags you just passed — read it before assuming a result
      reflects the credentials you think you gave it.

Config: values below are defaults. Every one of them can be overridden
without editing this file — via a .env file (see .env.example — copy it to
.env and fill in your values; loaded automatically if present, see
_load_dotenv() below), real exported environment variables (TS_CLUSTER_URL,
TS_SECRET_KEY, TS_ADMIN_USERNAME, TS_USERNAME, TS_PASSWORD,
TS_ORG_ID), or CLI flags (see --help) — so this script can be
handed to a customer to run against their own cluster with their own
credentials. Precedence: CLI flag > real env var > .env file > CONFIG
default. .env is the recommended way to supply secret_key/username/
password/token — it keeps them out of shell history and out of `ps`
output, unlike passing them as CLI arguments.

Output: both the audit CSV and the log file are named with --org-id (e.g.
ts_org_cleanup_audit_111.csv) so separate per-org runs never collide.

Usage (with a .env file in place — see .env.example):
  python ts-org-inactive-users-cleanup.py --list-orgs                # Find org IDs
  python ts-org-inactive-users-cleanup.py --org-id 111 --dry-run     # Safe preview
  python ts-org-inactive-users-cleanup.py --org-id 111               # Live run

Usage (everything via CLI flags instead, no .env file):
  python ts-org-inactive-users-cleanup.py \\
      --cluster-url https://my-cluster.thoughtspot.cloud \\
      --secret-key "$TS_SECRET_KEY" --admin-username <admin_username> \\
      --org-id 111 --dry-run

Dependencies:
  pip3 install -r requirements.txt
"""

import argparse
import csv
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import requests
import urllib3

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — edit this section before running
# ─────────────────────────────────────────────────────────────────────────────

CONFIG = {
    # Your cluster base URL — no trailing slash
    "cluster_url": "https://your-cluster.thoughtspot.cloud",

    # ── Auth — credentials for POST /api/rest/2.0/auth/token/full ────────────
    # The script mints a token scoped to --org-id (see module docstring:
    # org-scoped removal only works with a same-org-scoped token).
    # secret_key (Admin → Security Settings → Trusted Auth) is one option —
    # leave blank to fall back to username/password below. Either way, the
    # account needs "Can administer Org" in --org-id specifically.
    "secret_key": "YOUR_SECRET_KEY_HERE",
    "admin_username": "tsadmin",          # Used to mint the token

    "username": "tsadmin",
    "password": "YOUR_PASSWORD_HERE",

    # ── Inactivity threshold ──────────────────────────────────────────────────
    "inactivity_days": 10,

    # ── Per-org activity source ──────────────────────────────────────────────
    # Page size for paginating TS: BI Server activity events (one row per
    # query/liveboard-view event, not per user — expect far more rows than
    # users, so this is deliberately larger than batch_size below).
    "activity_page_size": 6000,

    # ── Safety settings ───────────────────────────────────────────────────────
    # Users to NEVER remove regardless of inactivity (by username)
    "protected_usernames": ["tsadmin", "system", "thoughtspot"],

    # How many users to process per API batch
    "batch_size": 50,

    # Seconds to sleep between deletion API calls (rate limiting)
    "delete_delay_sec": 0.2,

    # Retry settings for transient API failures (network errors, 429, 5xx)
    "max_retries": 3,
    "retry_backoff_sec": 1.0,

    # Suppress SSL warnings for self-signed certs (set False on prod with valid cert)
    "verify_ssl": False,
}

# Audit CSV and log file names both include the org_id being processed —
# one script run == one org (see module docstring), so this keeps separate
# runs' output files from colliding or overwriting each other.
def _audit_csv_path(org_id) -> Path:
    return Path(f"ts_org_cleanup_audit_{org_id}.csv")


def _log_file_path(org_id) -> str:
    return f"ts_org_cleanup_{org_id}.log"

# GUID of the built-in "TS: BI Server" system worksheet — fixed, not a
# per-cluster config value. Confirmed empirically to be identical across
# two different ThoughtSpot deployments.
BI_SERVER_WORKSHEET_ID = "eaab6de7-c556-468c-8b4b-ff6d78dd3ecf"

# ─────────────────────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)
# A per-run FileHandler (named after the org being processed, via
# _log_file_path()) is added directly in main() once org_id is known.

if not CONFIG["verify_ssl"]:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ─────────────────────────────────────────────────────────────────────────────
# Retry helper
# ─────────────────────────────────────────────────────────────────────────────

def _request_with_retry(method: str, url: str, max_retries: int,
                         backoff_sec: float, **kwargs) -> requests.Response:
    """
    Thin wrapper around requests.<method>() that retries transient failures
    (network errors, 429, 5xx) with exponential backoff. Client errors
    (4xx other than 429) are not retried — retrying won't fix a bad token or
    a bad request body, it'll just burn time before failing the same way.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.request(method, url, **kwargs)
            if resp.status_code == 429 or resp.status_code >= 500:
                if attempt < max_retries:
                    time.sleep(backoff_sec * (2 ** attempt))
                    continue
            return resp
        except requests.RequestException as e:
            last_exc = e
            if attempt < max_retries:
                time.sleep(backoff_sec * (2 ** attempt))
                continue
            raise
    raise last_exc  # pragma: no cover — unreachable, satisfies type checkers


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_token_via_secret_key(cluster_url: str, secret_key: str, username: str,
                              org_id: int, verify_ssl: bool,
                              max_retries: int, retry_backoff_sec: float) -> str:
    """Mint a per-org bearer token via POST /api/rest/2.0/auth/token/full, using secret_key."""
    url = f"{cluster_url}/api/rest/2.0/auth/token/full"
    payload = {
        "username": username,
        "secret_key": secret_key,
        "org_id": org_id,
        "validity_time_in_sec": 3600,
    }
    resp = _request_with_retry("POST", url, max_retries, retry_backoff_sec,
                                json=payload, verify=verify_ssl, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"auth/token/full {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    token = data.get("token")
    if not token:
        raise RuntimeError(f"No token in response for org {org_id}: {data}")

    # Validate scope — if user is not in this org, TS silently returns org_id=0
    returned_org = data.get("scope", {}).get("org_id")
    if returned_org is not None and int(returned_org) != int(org_id):
        raise RuntimeError(
            f"Token scope mismatch for org {org_id}: got org {returned_org}. "
            f"The admin user may not be a member of org {org_id}."
        )
    return token


def get_token_via_password(cluster_url: str, username: str, password: str,
                            org_id: int, verify_ssl: bool,
                            max_retries: int, retry_backoff_sec: float) -> str:
    """Mint a per-org bearer token via POST /api/rest/2.0/auth/token/full, using username + password."""
    url = f"{cluster_url}/api/rest/2.0/auth/token/full"
    payload = {
        "username": username,
        "password": password,
        "org_id": org_id,
        "validity_time_in_sec": 3600,
    }
    resp = _request_with_retry("POST", url, max_retries, retry_backoff_sec,
                                json=payload, verify=verify_ssl, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"auth/token/full {resp.status_code}: {resp.text[:300]}")
    return resp.json()["token"]


def make_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "X-Requested-By": "ThoughtSpot",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Org listing (for --list-orgs)
# ─────────────────────────────────────────────────────────────────────────────

def fetch_all_orgs(cluster_url: str, headers: dict, verify_ssl: bool,
                    max_retries: int, retry_backoff_sec: float) -> list:
    """
    List every org on the cluster via POST /api/rest/2.0/orgs/search.
    Org scope doesn't matter for this call — any valid token works,
    unlike users/search or the actual removal call (see module docstring).
    """
    url = f"{cluster_url}/api/rest/2.0/orgs/search"
    resp = _request_with_retry("POST", url, max_retries, retry_backoff_sec,
                                json={}, headers=headers, verify=verify_ssl, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"orgs/search {resp.status_code}: {resp.text[:300]}")
    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# User fetching — paginated
# ─────────────────────────────────────────────────────────────────────────────

def fetch_all_users_in_org(cluster_url: str, headers: dict,
                            org_id: int, batch_size: int,
                            verify_ssl: bool, max_retries: int,
                            retry_backoff_sec: float) -> list:
    """
    Fetch ALL users in a given org using paginated POST /api/rest/2.0/users/search.
    Pagination uses record_offset + record_size; stops when isLastBatch=true.
    """
    url = f"{cluster_url}/api/rest/2.0/users/search"
    all_users = []
    offset = 0

    while True:
        payload = {
            "org_identifiers": [str(org_id)],
            "record_offset": offset,
            "record_size": batch_size,
            "account_status": "ACTIVE",  # Only fetch active users
        }
        resp = _request_with_retry("POST", url, max_retries, retry_backoff_sec,
                                    json=payload, headers=headers,
                                    verify=verify_ssl, timeout=30)

        if resp.status_code == 400:
            # Some versions return 400 when org has no users — treat as empty
            log.warning(f"  Org {org_id}: 400 on users/search (possibly empty org). Skipping.")
            break

        if resp.status_code != 200:
            raise RuntimeError(f"users/search {resp.status_code}: {resp.text[:300]}")
        data = resp.json()

        # Response is a list of user objects
        page = data if isinstance(data, list) else data.get("users", [])
        all_users.extend(page)

        log.info(f"  Fetched {len(page)} users at offset {offset} "
                 f"(total so far: {len(all_users)})")

        # Check pagination — last_batch signals end of results
        is_last = data.get("isLastBatch", True) if isinstance(data, dict) else (len(page) < batch_size)
        if is_last or len(page) < batch_size or len(page) == 0:
            break

        offset += batch_size
        time.sleep(0.1)  # Gentle rate limiting

    return all_users


# ─────────────────────────────────────────────────────────────────────────────
# Activity detection
# ─────────────────────────────────────────────────────────────────────────────

def _parse_bi_server_timestamp(cell) -> Optional[datetime]:
    """
    TS: BI Server's Timestamp column is documented as "yyyyMMdd HH:mm:ss",
    but COMPACT-format date/time cells in this API family have also been
    observed epoch-wrapped instead ({"v": {"s": epoch_seconds}}) — handle
    both rather than assume one.
    Returns None (never raises) on anything unrecognized, so a parsing miss
    just fails open (treated as "not yet past cutoff") instead of crashing
    a run over one odd row.
    """
    if isinstance(cell, dict):
        epoch = cell.get("v", {}).get("s")
        return datetime.fromtimestamp(epoch, tz=timezone.utc) if epoch is not None else None
    if isinstance(cell, (int, float)):
        return datetime.fromtimestamp(cell / 1000 if cell > 1e12 else cell, tz=timezone.utc)
    if isinstance(cell, str) and cell:
        try:
            return datetime.strptime(cell, "%Y%m%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def fetch_active_user_ids_in_org(cluster_url: str, headers: dict, org_id: int,
                                  worksheet_id: str, inactivity_days: int,
                                  page_size: int, verify_ssl: bool,
                                  max_retries: int, retry_backoff_sec: float) -> set:
    """
    User IDs with at least one "TS: BI Server" event (query/liveboard-view)
    in this org within the last `inactivity_days` days — the real per-org
    activity signal (see module docstring CAVEAT: users/search's
    last_login_time is cluster-wide, not org-scoped).

    Deliberately no date-range filter in the query string (an earlier
    version's "[Timestamp] >= '...'" 400'd — likely the operator, the ISO
    date format, or both). Instead: sort by Timestamp descending, paginate,
    and stop client-side the moment a row crosses the cutoff — reduce over
    sorted rows in Python rather than trust the query string to
    filter/aggregate correctly.
    """
    url = f"{cluster_url}/api/rest/2.0/searchdata"
    cutoff = datetime.now(timezone.utc) - timedelta(days=inactivity_days)
    # Org Id is a numeric column (returned as a bare JSON number by
    # orgs/search) — unquoted, unlike a quoted string-typed filter
    # (e.g. [SomeTextColumn] = 'value').
    # ".daily" forces day-level date bucketing on [Timestamp] — without it,
    # TS's search engine picks a default granularity based on the full
    # result set's date range (verified empirically: it silently returned
    # Month(Timestamp) here), which is too coarse for a day-based
    # inactivity threshold. Day precision is all a 10-day check needs.
    query = f"[User Id] [Org Id] [Timestamp].daily [Org Id] = {org_id} sort by [Timestamp].daily descending"
    active_ids: set = set()
    offset = 0

    while True:
        resp = _request_with_retry("POST", url, max_retries, retry_backoff_sec,
                                    json={
                                        "query_string": query,
                                        "logical_table_identifier": worksheet_id,
                                        "data_format": "COMPACT",
                                        "record_offset": offset,
                                        "record_size": page_size,
                                    },
                                    headers=headers, verify=verify_ssl, timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"searchdata {resp.status_code}: {resp.text[:300]}")
        rows = resp.json().get("contents", [{}])[0].get("data_rows", [])
        if not rows:
            break

        hit_cutoff = False
        for row in rows:
            ts = _parse_bi_server_timestamp(row[2])
            if ts is not None and ts < cutoff:
                hit_cutoff = True  # sorted descending — every row after this is older too
                break
            if row[0]:
                active_ids.add(str(row[0]))

        if hit_cutoff or len(rows) < page_size:
            break
        offset += page_size

    return active_ids


def is_inactive_in_org(user: dict, active_user_ids: set, inactivity_days: int) -> tuple[bool, str]:
    """
    Returns (is_inactive: bool, reason: str). Inactive means no "TS: BI
    Server" activity recorded for this user in this org within
    inactivity_days — see fetch_active_user_ids_in_org.
    """
    user_id = str(user.get("id", user.get("user_id", "")))
    if user_id in active_user_ids:
        return False, f"Active — BI Server activity in this org within last {inactivity_days}d"
    return True, f"No BI Server activity in this org in the last {inactivity_days}d"


# ─────────────────────────────────────────────────────────────────────────────
# Deletion
# ─────────────────────────────────────────────────────────────────────────────

def remove_user_from_org(cluster_url: str, user_id: str, org_id: int,
                          token: str, verify_ssl: bool, dry_run: bool,
                          max_retries: int, retry_backoff_sec: float) -> tuple[bool, str]:
    """
    Remove a user from ONE org only (not the cluster, not other orgs).

    Uses: POST /api/rest/2.0/users/{user_id}/update,
    {"org_identifiers": [org_id], "operation": "REMOVE"}.

    NOT POST /api/rest/2.0/orgs/{org_id}/update (the same idea, inverted —
    updating the org's user list instead of the user's org list). That one
    returned a false-positive 204 for a freshly-created org: HTTP success,
    but the user's actual org membership never changed — confirmed by
    reading the user back afterward. This users/{id}/update form was
    verified durable the same way (the org genuinely disappears from the
    user's own `orgs` list). Requires `token` to be scoped to org_id
    specifically (see module docstring).

    In dry_run mode: logs what WOULD happen but makes no API call.
    """
    if dry_run:
        return True, "DRY RUN — no API call made"

    url = f"{cluster_url}/api/rest/2.0/users/{user_id}/update"
    headers = make_headers(token)

    try:
        resp = _request_with_retry("POST", url, max_retries, retry_backoff_sec,
                                    json={"org_identifiers": [str(org_id)], "operation": "REMOVE"},
                                    headers=headers, verify=verify_ssl, timeout=30)

        if resp.status_code in (200, 204):
            return True, f"Removed (HTTP {resp.status_code})"
        else:
            return False, f"API error HTTP {resp.status_code}: {resp.text[:200]}"

    except requests.RequestException as e:
        return False, f"Request failed: {e}"


# ─────────────────────────────────────────────────────────────────────────────
# Audit log
# ─────────────────────────────────────────────────────────────────────────────

def write_audit_row(writer, user: dict, org_id: int, inactive: bool,
                    reason: str, action_taken: str, result: str,
                    dry_run: bool):
    writer.writerow({
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "dry_run": dry_run,
        "org_id": org_id,
        "user_id": user.get("id", user.get("user_id", "unknown")),
        "username": user.get("name", "unknown"),
        "display_name": user.get("display_name", ""),
        "email": user.get("email", ""),
        "inactive": inactive,
        "reason": reason,
        "action": action_taken,
        "result": result,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Main processing
# ─────────────────────────────────────────────────────────────────────────────

def process_org(org_id: int, config: dict, dry_run: bool,
                csv_writer) -> dict:
    """
    Process one org: fetch users, identify inactive, optionally remove them.
    Returns a summary dict.
    """
    summary = {"total": 0, "inactive": 0,
                "removed": 0, "errors": 0, "skipped": 0}

    log.info(f"\n{'='*60}")
    log.info(f"Processing org_id={org_id}")
    log.info(f"{'='*60}")

    # ── Get a token scoped to this org ────────────────────────────────────────
    # A token scoped to org_id specifically is required — the actual
    # removal call (users/{user_id}/update) only works reliably with one
    # (see module docstring). Mint one via secret_key/username+password.
    try:
        if config["secret_key"] and config["secret_key"] != "YOUR_SECRET_KEY_HERE":
            log.info(f"  Minting token for org {org_id} via Trusted Auth (secret_key)...")
            token = get_token_via_secret_key(
                config["cluster_url"], config["secret_key"],
                config["admin_username"], org_id, config["verify_ssl"],
                config["max_retries"], config["retry_backoff_sec"],
            )
        else:
            log.info(f"  Getting token via username/password for org {org_id}...")
            token = get_token_via_password(
                config["cluster_url"], config["username"],
                config["password"], org_id, config["verify_ssl"],
                config["max_retries"], config["retry_backoff_sec"],
            )
    except Exception as e:
        log.error(f"  ✗ Could not get token for org {org_id}: {e}")
        summary["errors"] += 1
        return summary

    headers = make_headers(token)

    # ── Fetch all users in this org ───────────────────────────────────────────
    log.info(f"  Fetching users in org {org_id}...")
    try:
        users = fetch_all_users_in_org(
            config["cluster_url"], headers, org_id,
            config["batch_size"], config["verify_ssl"],
            config["max_retries"], config["retry_backoff_sec"],
        )
    except Exception as e:
        log.error(f"  ✗ Failed to fetch users for org {org_id}: {e}")
        summary["errors"] += 1
        return summary

    summary["total"] = len(users)
    log.info(f"  Found {len(users)} active users in org_id={org_id}")

    # ── Fetch per-org activity (once per org, not once per user) ─────────────
    try:
        active_user_ids = fetch_active_user_ids_in_org(
            config["cluster_url"], headers, org_id,
            BI_SERVER_WORKSHEET_ID, config["inactivity_days"],
            config["activity_page_size"], config["verify_ssl"],
            config["max_retries"], config["retry_backoff_sec"],
        )
        log.info(f"  {len(active_user_ids)} users had BI Server activity in org {org_id} "
                 f"within the last {config['inactivity_days']}d")
    except Exception as e:
        log.error(f"  ✗ Failed to fetch org activity for org {org_id}: {e}")
        summary["errors"] += 1
        return summary

    # ── Check each user ───────────────────────────────────────────────────────
    for user in users:
        username = user.get("name", "")
        user_id = user.get("id", user.get("user_id", ""))
        display = user.get("display_name", username)

        # Skip protected users
        if username.lower() in [u.lower() for u in config["protected_usernames"]]:
            log.debug(f"  Skipping protected user: {username}")
            write_audit_row(csv_writer, user, org_id, False, "Protected user",
                            "SKIPPED", "Protected", dry_run)
            summary["skipped"] += 1
            continue

        # Check inactivity
        inactive, reason = is_inactive_in_org(user, active_user_ids, config["inactivity_days"])

        if not inactive:
            log.debug(f"  {display!r}: Active — {reason}")
            write_audit_row(csv_writer, user, org_id, False, reason,
                            "KEPT", "Active", dry_run)
            continue

        summary["inactive"] += 1
        action_label = "DRY-RUN WOULD REMOVE" if dry_run else "REMOVING"
        log.info(f"  [{action_label}] {display!r} ({username}) — {reason}")

        # Remove from this org
        success, result_msg = remove_user_from_org(
            config["cluster_url"], user_id, org_id,
            token, config["verify_ssl"], dry_run,
            config["max_retries"], config["retry_backoff_sec"],
        )

        if success:
            summary["removed"] += 1
            log.info(f"    ✓ {result_msg}")
        else:
            summary["errors"] += 1
            log.error(f"    ✗ {result_msg}")

        write_audit_row(csv_writer, user, org_id, True, reason,
                        "DRY_RUN" if dry_run else "REMOVED",
                        result_msg, dry_run)

        # Rate limiting between deletions
        if not dry_run:
            time.sleep(config["delete_delay_sec"])

    return summary


_DOTENV_KEYS: set = set()


def _load_dotenv(path: str = ".env") -> None:
    """
    Minimal .env loader — populates os.environ from KEY=VALUE lines in
    `path` (if it exists), skipping blank lines and lines starting with #.
    A real, already-exported env var is NOT overwritten — .env is a
    fallback default, not an override (see module docstring: CLI flag >
    real env var > .env file > CONFIG default). Deliberately hand-rolled
    instead of depending on python-dotenv, to keep this a single-file
    script with one pip dependency (requests).

    Records which keys it actually set (as opposed to ones already present
    in the environment) in _DOTENV_KEYS, so _resolve() below can label
    those values as coming from ".env file" specifically rather than
    lumping them in with "env var" — the distinction matters because a
    stale .env value silently overriding a CLI flag is exactly the kind of
    thing that has already caused a long, confusing debugging session once
    (with a real exported env var) and .env is if anything more likely to
    go stale unnoticed, since it persists across sessions.
    """
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value
            _DOTENV_KEYS.add(key)


def _resolve(cli_val, env_name, default=None):
    """CLI flag > real env var > .env file > default, returning
    (value, source_label) — the source is surfaced in the startup banner
    so a stale env var or .env value silently overriding an intended CLI
    flag (as has actually happened) is visible immediately instead of
    discovered after a confusing debugging session."""
    if cli_val:
        return cli_val, "CLI flag"
    env_val = os.environ.get(env_name)
    if env_val:
        source = ".env file" if env_name in _DOTENV_KEYS else f"{env_name} env var"
        return env_val, source
    return default, "default"


def main():
    _load_dotenv()  # populate os.environ from .env, if present — see _load_dotenv()

    parser = argparse.ArgumentParser(
        description="Remove inactive users from ONE ThoughtSpot org (org-scoped only). "
                    "Credentials can be put in a .env file instead of passed as flags — see .env.example."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Preview what WOULD be removed without making any API delete calls.",
    )
    parser.add_argument(
        "--org-id",
        type=int,
        default=None,
        help="The org to process — required unless --list-orgs. One run processes exactly one org (see module docstring).",
    )
    parser.add_argument(
        "--inactivity-days",
        type=int,
        default=None,
        help="Override the inactivity threshold (default: from CONFIG).",
    )
    parser.add_argument("--cluster-url", default=None, help="ThoughtSpot cluster base URL, no trailing slash.")
    parser.add_argument("--secret-key", default=None, help="Trusted Auth secret_key, used to mint a token scoped to --org-id. Can itself be org-scoped on some deployments — if you hit \"service secret code is not valid\", get the key from that specific org's Security Settings, or use --username/--password instead.")
    parser.add_argument("--admin-username", default=None, help="Username to mint the token as (used with --secret-key).")
    parser.add_argument("--username", default=None, help="Username for password-based auth (used if --secret-key is not given).")
    parser.add_argument("--password", default=None, help="Password for password-based auth.")
    parser.add_argument(
        "--list-orgs",
        action="store_true",
        default=False,
        help="List every org on the cluster (id + name) and exit — mints its own token internally, so you don't need to curl orgs/search or a token yourself.",
    )
    args = parser.parse_args()

    # Precedence for every credential/target value: CLI flag > env var > CONFIG
    # default — this is what lets the same script run against any customer's
    # cluster without editing the file: set env vars (or pass flags) instead.
    config = CONFIG.copy()
    config["cluster_url"], _cluster_src = _resolve(args.cluster_url, "TS_CLUSTER_URL", config["cluster_url"])
    config["secret_key"], secret_key_src = _resolve(args.secret_key, "TS_SECRET_KEY", config["secret_key"])
    config["admin_username"], _admin_src = _resolve(args.admin_username, "TS_ADMIN_USERNAME", config["admin_username"])
    config["username"], username_src = _resolve(args.username, "TS_USERNAME", config["username"])
    config["password"], password_src = _resolve(args.password, "TS_PASSWORD", config["password"])

    if args.list_orgs:
        # org_id=0 here is just this token's own login context — irrelevant
        # for orgs/search, which (unlike users/search or the removal call)
        # isn't org-scoped, so any valid token can list every org.
        try:
            if config["secret_key"] and config["secret_key"] != "YOUR_SECRET_KEY_HERE":
                token = get_token_via_secret_key(
                    config["cluster_url"], config["secret_key"],
                    config["admin_username"], 0, config["verify_ssl"],
                    config["max_retries"], config["retry_backoff_sec"],
                )
            else:
                token = get_token_via_password(
                    config["cluster_url"], config["username"],
                    config["password"], 0, config["verify_ssl"],
                    config["max_retries"], config["retry_backoff_sec"],
                )
        except Exception as e:
            log.error(f"Could not get a token to list orgs: {e}")
            sys.exit(1)

        try:
            orgs = fetch_all_orgs(
                config["cluster_url"], make_headers(token), config["verify_ssl"],
                config["max_retries"], config["retry_backoff_sec"],
            )
        except Exception as e:
            log.error(f"Failed to list orgs: {e}")
            sys.exit(1)

        log.info(f"Found {len(orgs)} orgs:")
        for o in sorted(orgs, key=lambda x: (x.get("name") or "").lower()):
            log.info(f"  {o.get('id')}: {o.get('name')}")
        sys.exit(0)

    # ── Resolve which org to process — exactly one per run (see module docstring) ──
    org_id = args.org_id
    if org_id is None:
        env_org_id = os.environ.get("TS_ORG_ID")
        if env_org_id:
            org_id = int(env_org_id)
    if org_id is None:
        log.error("No org specified — pass --org-id (or set TS_ORG_ID). Use --list-orgs to find its value.")
        sys.exit(1)
    if args.inactivity_days:
        config["inactivity_days"] = args.inactivity_days

    dry_run = args.dry_run

    # Per-org log file, added now that org_id is known — see module docstring.
    log.addHandler(logging.FileHandler(_log_file_path(org_id)))

    # ── Banner ────────────────────────────────────────────────────────────────
    if config["secret_key"] and config["secret_key"] != "YOUR_SECRET_KEY_HERE":
        auth_desc = f"secret_key ({secret_key_src}), admin_username={config['admin_username']!r}"
    else:
        auth_desc = f"username/password (username via {username_src}, password via {password_src})"

    log.info("=" * 60)
    log.info("  ThoughtSpot Org Inactivity Cleanup")
    log.info(f"  Cluster : {config['cluster_url']}")
    log.info(f"  Org     : org_id={org_id}")
    log.info(f"  Auth    : {auth_desc}")
    log.info(f"  Inactive: > {config['inactivity_days']} days")
    log.info(f"  Mode    : {'🔍 DRY RUN — NO CHANGES WILL BE MADE' if dry_run else '🔴 LIVE — USERS WILL BE REMOVED FROM ORGS'}")
    log.info("=" * 60)

    # A stale env var or .env value silently outranking an explicitly-passed
    # CLI flag has already caused a long, confusing debugging session once
    # (a leftover TS_SECRET_KEY beat --username/--password with zero
    # indication) — call it out loudly here instead of letting it happen
    # silently again. .env is if anything more likely to go stale unnoticed
    # than a shell-exported var, since it persists across sessions.
    if (config["secret_key"] and config["secret_key"] != "YOUR_SECRET_KEY_HERE"
            and secret_key_src != "CLI flag" and (args.username or args.password)):
        log.warning(
            f"  ⚠ TS_SECRET_KEY is set (from {secret_key_src}) and takes priority over "
            "--username/--password — remove/unset it if you meant to use those instead."
        )

    # No interactive confirmation prompt here (deliberately) — this script is
    # meant to be runnable unattended (cron, scheduled automation), where
    # there's no tty to answer a prompt. The 🔴 LIVE banner above and
    # --dry-run are the safety net instead: always dry-run first.

    # ── Open audit log ────────────────────────────────────────────────────────
    audit_path = _audit_csv_path(org_id)
    fieldnames = ["timestamp", "dry_run", "org_id", "user_id",
                  "username", "display_name", "email", "inactive",
                  "reason", "action", "result"]

    with open(audit_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        summary = process_org(org_id, config, dry_run, writer)

    # ── Final report ──────────────────────────────────────────────────────────
    log.info("\n" + "=" * 60)
    log.info("  FINAL SUMMARY")
    log.info("=" * 60)
    label = "Would remove" if dry_run else "Removed"
    log.info(
        f"  Org: {org_id!s:<30} "
        f"Total={summary['total']:>4}  "
        f"Inactive={summary['inactive']:>4}  "
        f"{label}={summary['removed']:>4}  "
        f"Errors={summary['errors']:>3}  "
        f"Skipped={summary['skipped']:>3}"
    )
    mode_str = "would be removed (DRY RUN)" if dry_run else "removed from this org"
    log.info(f"\n  Total users {mode_str}: {summary['removed']}")
    log.info(f"  Audit log: {audit_path.resolve()}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
