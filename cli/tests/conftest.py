import os
import pytest

@pytest.fixture
def temp_workspace(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    return str(workspace)

@pytest.fixture(autouse=True)
def clean_env():
    # Ensure tests don't touch the user's actual .mosaic.env
    old_env = os.environ.get("MOSAIC_CONFIG_PATH")
    os.environ["MOSAIC_CONFIG_PATH"] = "/tmp/.mosaic_test.env"
    yield
    if old_env:
        os.environ["MOSAIC_CONFIG_PATH"] = old_env
    else:
        del os.environ["MOSAIC_CONFIG_PATH"]
