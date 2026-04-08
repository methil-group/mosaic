# Implement File Statistics Script

Your task is to create a new Python script named `stats.py` in the current directory.

Spec for `stats.py`:
1. It must accept a single command-line argument: the path to a text file.
2. It must read the file and calculate:
    - The number of lines.
    - The total number of words (whitespace separated).
3. It must print the results in exactly this format:
   `Lines: X, Words: Y`
4. If the file does not exist, it should print `Error: File not found` and exit with code 1.

Example usage: `python stats.py data.txt`
Example output: `Lines: 3, Words: 15`
