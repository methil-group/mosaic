from setuptools import setup, find_packages

import os

def get_version():
    with open("VERSION", "r") as f:
        return f.read().strip()

setup(
    name="mosaic-tui",
    version=get_version(),
    packages=find_packages(),
    install_requires=[
        "textual",
        "httpx",
        "rich",
        "python-dotenv",
    ],
    entry_points={
        "console_scripts": [
            "mosaic=mosaic_cli.main:run",
        ],
    },
    include_package_data=True,
    package_data={
        "mosaic_cli": ["*.css"],
    },
)
