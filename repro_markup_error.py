from rich.markup import render, escape
import json

def test_markup(text, use_escape=True):
    content = f"[bold spring_green3]↳ Result[/]\n[dim]{escape(text) if use_escape else text}[/]"
    print(f"Testing {'with' if use_escape else 'without'} escape:")
    try:
        render(content)
        print("Success!")
    except Exception as e:
        print(f"Failed: {e}")

# Problematic string from setup.py
setup_content = """
    entry_points={
        "console_scripts": [
            "mosaic=mosaic_cli.main:run",
        ],
    },
"""

print("Testing setup_content (similar to what was in the traceback)")
test_markup(setup_content, use_escape=False)
test_markup(setup_content, use_escape=True)

# Test with the EXACT string found in the error
exact_problem = '":run",\n'
print(f"Testing with exact_problem: {repr(exact_problem)}")
# If it's used as a tag, it would be [":run",\n]
try:
    render(f'[bold]["something" {exact_problem}][/]')
    print("Success with tag!")
except Exception as e:
    print(f"Failed with tag: {e}")
