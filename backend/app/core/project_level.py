LEVEL_TO_CRON = {
    "L1": "*/10 * * * *",  # 10m
    "L2": "*/30 * * * *",  # 30m
    "L3": "0 */3 * * *",  # 3h
    "L4": "0 9 * * *",  # daily 9am
}

TRIGGERS = [
    "incident",
    "approval_overdue",
    "test_fail",
]


def cron_for_level(level: str) -> str:
    return LEVEL_TO_CRON.get(level, "*/30 * * * *")
