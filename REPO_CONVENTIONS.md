# Repo Conventions (enforced)

## Python runtime / venv
- Use Python 3.12.x
- Per-repo virtualenv required: `venv/`
- Preferred command (Windows style): `py -3.12 -m venv venv`
- macOS equivalent used here: `python3.12 -m venv venv`

## Quality gates
- black formatter required
- pre-commit required
- bandit must pass
- repository pattern for DB CRUD (`*_repository.py`)
- DI pattern with `dependency_injector` containers
- unit tests required
- SOLID + modern Python style required
