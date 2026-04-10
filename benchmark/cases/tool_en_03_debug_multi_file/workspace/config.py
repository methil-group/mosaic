_config_data = {
    "limit": 15
}

def get_threshold():
    # BUG: Typo in the key. Should be "limit"
    return _config_data["threshold_limit"]
