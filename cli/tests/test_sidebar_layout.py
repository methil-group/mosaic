import asyncio
import os
import sys
from textual.app import App

# Add current dir to sys.path
sys.path.append(os.getcwd())

from mosaic_cli.main import Mosaic

async def run_layout_test():
    """
    E2E test to verify that sidebars are correctly sized and positioned.
    """
    os.environ["MOSAIC_CONFIG"] = "/tmp/.mosaic.env"
    
    app = Mosaic()
    async with app.run_test() as pilot:
        sidebar = app.query_one("#history-sidebar")
        screen = app.screen
        header = app.query_one("Header")
        footer = app.query_one("Footer")
        
        print(f"Screen size: {screen.size}")
        print(f"Header height: {header.size.height}")
        print(f"Footer height: {footer.size.height}")
        print(f"Sidebar size: {sidebar.size}")
        print(f"Sidebar offset: {sidebar.offset}")
        
        # ASSERTIONS
        # 1. Sidebar height should be Screen height minus Header and Footer heights
        expected_height = screen.size.height - header.size.height - footer.size.height
        assert sidebar.size.height == expected_height, f"Sidebar height {sidebar.size.height} != expected {expected_height}"
        
        # 2. Sidebar offset.y should be Header height (not overlapping Header)
        assert sidebar.offset.y == header.size.height, f"Sidebar offset.y {sidebar.offset.y} != header height {header.size.height}"
        
        # 3. Sidebar should be on the left (offset.x == 0)
        assert sidebar.offset.x == 0, f"Sidebar offset.x {sidebar.offset.x} != 0"
        
        print("TEST PASSED: Sidebar layout is correct.")

if __name__ == "__main__":
    try:
        asyncio.run(run_layout_test())
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
