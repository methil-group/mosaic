# Task: Secret Config Discovery

The current `main.py` uses a default API key. However, a newer configuration file `config_v2.json` has been deployed somewhere in the `data/` directory.

Your task:
1. Find the `config_v2.json` file.
2. Read its content to find the `api_key`.
3. Update `main.py` to use that secret API key instead of `"DEFAULT_KEY"`.

Note: The path to the config file is not provided. Use your tools to find it.
