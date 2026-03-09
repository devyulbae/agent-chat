# Repo Conventions (enforced)

## Python runtime / venv
- Use Python 3.12.x
- Per-repo virtualenv required: `venv/`
- Preferred command (Windows style): `py -3.12 -m venv venv`
- macOS equivalent used here: `python3.12 -m venv venv`

## Project structure standard (root-based)
- Prefer this root layout:
  - `docs/` (specs, runbooks, architecture, wiki-style docs)
  - `src/` (application source code)
  - `tests/` (unit tests)
  - `configs/` (runtime/test config files)
  - `logs/` (runtime/test logs; gitignored as needed)
- Keep one root entrypoint file: `app.py` or `main.py` or `server.py`.
- Avoid placing business logic in root entrypoint; keep logic under `src/`.

## Architecture and DI standard
- Interface/implementation split is required for core components.
  - Example: `src/services/iclassifier.py` (ABC interface)
  - Example: `src/services/classifier.py` (concrete implementation)
- Use `dependency_injector` for wiring.
  - Main container: `src/containers/server_container.py`
  - Test container: `src/containers/test_container.py` (when needed)
- `configs/` values must be injected through containers (no ad-hoc global config reads inside feature code).

## Testing standard
- `tests/` must contain unit tests for interface contract and concrete implementation behavior.
- Python standard tests should be `unittest`-compatible (pytest runner is allowed).
- Any new service/repository should include at least one unit test case.

## Quality gates
- black formatter required
- pre-commit required
- bandit must pass
- repository pattern for DB CRUD (`*_repository.py`)
- DI pattern with `dependency_injector` containers
- unit tests required
- SOLID + modern Python style required
