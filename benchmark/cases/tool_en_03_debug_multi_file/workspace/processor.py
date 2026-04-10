import config

def process(data):
    threshold = config.get_threshold()
    return [x for x in data if x > threshold]
