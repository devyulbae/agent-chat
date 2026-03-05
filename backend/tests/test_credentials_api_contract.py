from app.main import create_app


def test_credentials_expiring_window_contract_bounds() -> None:
    app = create_app()
    schema = app.openapi()

    get_operation = schema["paths"]["/api/credentials"]["get"]
    expiring_param = next(
        parameter
        for parameter in get_operation["parameters"]
        if parameter["name"] == "expiring_within_hours"
    )

    assert expiring_param["in"] == "query"
    assert expiring_param["schema"]["default"] == 24
    assert expiring_param["schema"]["minimum"] == 1
    assert expiring_param["schema"]["maximum"] == 24 * 30
