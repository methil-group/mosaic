import os
import pytest
import tempfile

@pytest.fixture
def temp_workspace(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    return str(workspace)

@pytest.fixture(autouse=True)
def clean_env():
    # Ensure tests don't touch the user's actual .mosaic.env
    old_env = os.environ.get("MOSAIC_CONFIG_PATH")
    temp_env_path = os.path.join(tempfile.gettempdir(), ".mosaic_test.env")
    os.environ["MOSAIC_CONFIG_PATH"] = temp_env_path
    yield
    if old_env:
        os.environ["MOSAIC_CONFIG_PATH"] = old_env
    else:
        del os.environ["MOSAIC_CONFIG_PATH"]
