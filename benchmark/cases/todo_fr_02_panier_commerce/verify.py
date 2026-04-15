import os
import sys

def verify(workspace):
    todo_file = os.path.join(workspace, "todo.md")
    if not os.path.exists(todo_file):
        print("Échec : todo.md introuvable")
        return False
        
    with open(todo_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["panier", "produit", "quantite", "total", "tva", "stockage", "session"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Réussite : Plan de système de panier généré")
        return True
    else:
        print(f"Échec : Le plan manque de détails sur le e-commerce (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
