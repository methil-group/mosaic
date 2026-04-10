from world import World
from event_bus import EventBus
from combat_system import CombatSystem
from ui_system import UISystem

# Initialize
bus = EventBus()
world = World(bus)
combat = CombatSystem(world, bus)
ui = UISystem(bus)

# Simulate
print("--- Combat simulation ---")
combat.deal_damage(1, 15)
combat.deal_damage(2, 50)

print(f"Total UI logs: {len(ui.logs)}")
if len(ui.logs) == 2:
    print("Success: UI System received all combat events.")
else:
    print("Failure: Some events were missed.")
