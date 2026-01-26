# This is the main entry point for the Methil Vibe application.
# It initializes and runs the Text User Interface (TUI) for the agent.

from src.UI.tui import AgentTUI  # Import the AgentTUI class from the UI module

if __name__ == "__main__":  # Check if this script is being run directly
    app = AgentTUI()  # Create an instance of the AgentTUI class
    app.run()  # Run the TUI application
