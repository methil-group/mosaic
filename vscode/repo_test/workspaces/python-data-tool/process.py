import json

def process_data(data):
    return [d.upper() for d in data]

if __name__ == "__main__":
    raw = ["apple", "banana", "cherry"]
    print(process_data(raw))
