from app.main import create_app


def test_run_logs_and_inbox_contract_available() -> None:
    app = create_app()
    schema = app.openapi()

    run_logs_get = schema["paths"]["/api/run-logs"]["get"]
    inbox_get = schema["paths"]["/api/inbox"]["get"]

    assert run_logs_get["responses"]["200"]["description"] == "Successful Response"
    assert inbox_get["responses"]["200"]["description"] == "Successful Response"
