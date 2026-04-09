# Task: Plan Refactoring of Legacy Payment System

The `PaymentProcessor.py` file is a 2000-line "God Object" that handles everything from database connections to credit card validation and receipt generation.

Your task:
Create a detailed plan for refactoring this system into a clean, maintainable architecture.
Write your plan in a file named `plan.md`.

Requirements for your plan:
1. Identify at least 3 distinct responsibilities to extract into separate classes/modules.
2. Define the steps for a safe migration (e.g., writing tests first).
3. Mention which design patterns could be applicable (e.g., Strategy, Factory).
4. Outline the final structure of the directory.
