"""CLI entrypoint.

  python run.py refresh     # scrape all data, compute, write snapshot.json
  python run.py serve       # run the dashboard backend (same as server.py)
"""

from __future__ import annotations

import argparse
import json

import build


def main() -> None:
    parser = argparse.ArgumentParser(description="Independent market dashboard")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("refresh", help="scrape data + rebuild snapshot")
    sub.add_parser("serve", help="run the dashboard backend")
    args = parser.parse_args()

    if args.cmd == "refresh":
        snap = build.build(verbose=True)
        print(json.dumps(snap["overall"], indent=2))
        print(f"ok {snap['ok_count']}/{snap['total_count']}, errors {len(snap['errors'])}")
    elif args.cmd == "serve":
        import server
        server.main()


if __name__ == "__main__":
    main()
