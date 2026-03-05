from app.main import create_app


def test_audit_events_limit_contract_bounds() -> None:
    app = create_app()
    schema = app.openapi()

    get_operation = schema["paths"]["/api/audit-events"]["get"]
    limit_param = next(
        parameter
        for parameter in get_operation["parameters"]
        if parameter["name"] == "limit"
    )

    assert limit_param["in"] == "query"
    assert limit_param["schema"]["default"] == 100
    assert limit_param["schema"]["minimum"] == 1
    assert limit_param["schema"]["maximum"] == 100

    offset_param = next(
        parameter
        for parameter in get_operation["parameters"]
        if parameter["name"] == "offset"
    )
    assert offset_param["in"] == "query"
    assert offset_param["schema"]["default"] == 0
    assert offset_param["schema"]["minimum"] == 0
