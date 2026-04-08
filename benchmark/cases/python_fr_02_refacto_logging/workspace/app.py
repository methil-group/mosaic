import os

def process_data(data):
    print(f"D\u00e9but du traitement de {len(data)} \u00e9l\u00e9ments")
    # Simulation de traitement
    result = [x * 2 for x in data]
    print("Fin du traitement avec succ\u00e8s")
    return result

if __name__ == "__main__":
    data = [1, 2, 3, 4, 5]
    res = process_data(data)
    print(f"R\u00e9sultat final : {res}")
