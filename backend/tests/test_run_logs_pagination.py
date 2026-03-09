from app.api import routes


def test_run_logs_returns_recent_first_with_limit_and_offset() -> None:
    original = list(routes.RUN_LOGS)
    routes.RUN_LOGS.clear()
    try:
        for idx in range(5):
            routes.append_run_log({"idx": idx})

        recent = routes.list_run_logs()
        assert [item["idx"] for item in recent] == [4, 3, 2, 1, 0]

        window = routes.list_run_logs(limit=2, offset=1)
        assert [item["idx"] for item in window] == [3, 2]
    finally:
        routes.RUN_LOGS.clear()
        routes.RUN_LOGS.extend(original)
