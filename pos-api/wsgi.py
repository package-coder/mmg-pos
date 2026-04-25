# Gunicorn entry point.
# `app.py` is shadowed by the `app/` package when imported by name,
# so we load it explicitly by file path.
import importlib.util
import os

_spec = importlib.util.spec_from_file_location(
    "_flask_app",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py"),
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
app = _mod.app
