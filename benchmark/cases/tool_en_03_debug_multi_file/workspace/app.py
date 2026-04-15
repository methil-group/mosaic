import processor

def run():
    print("Starting application...")
    try:
        data = [10, 20, 30]
        result = processor.process(data)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Application Error: {e}")
        with open("logs/error.log", "w") as f:
            f.write(f"Traceback: processor.py:12 in process -> config.py:5 in get_threshold\n")
            f.write(f"KeyError: 'threshold_limit' not found in configuration data.\n")

if __name__ == "__main__":
    run()
