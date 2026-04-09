import os
import sys

def verify(workspace):
    perf_file = os.path.join(workspace, "performance.md")
    if not os.path.exists(perf_file):
        print("Échec : performance.md introuvable")
        return False
        
    with open(perf_file, "r") as f:
        content = f.read().lower()
        
    keywords = ["lcp", "performance", "image", "bundle", "cache", "lighthouse", "cdn"]
    score = sum(1 for k in keywords if k in content)
    
    if score >= 4:
        print("Réussite : Plan d'optimisation de performance généré")
        return True
    else:
        print(f"Échec : Le plan manque de détails techniques sur la performance (Score: {score})")
        return False

if __name__ == "__main__":
    if verify(sys.argv[1]):
        sys.exit(0)
    else:
        sys.exit(1)
