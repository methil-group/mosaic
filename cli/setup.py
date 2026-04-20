from setuptools import setup, find_packages

setup(
    name="mosaic-tui",
    version="0.1.0",
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
