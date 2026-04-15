def process_data(data):
    print(f"Starting to process {len(data)} items")
    results = []
    for i, item in enumerate(data):
        if item is None:
            print(f"Warning: Item at index {i} is None, skipping")
            continue
        try:
            # Simulate processing
            res = item * 2
            results.append(res)
        except Exception as e:
            print(f"Error processing item '{item}': {e}")
    
    print("Processing complete")
    return results

if __name__ == "__main__":
    test_data = [1, 2, None, "bad", 5]
    print("Main execution started")
    processed = process_data(test_data)
    print(f"Final results: {processed}")
