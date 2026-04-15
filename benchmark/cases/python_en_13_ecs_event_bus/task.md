# Task: Inter-System Communication via Event Bus

In this multi-file Python project, your goal is to enable communication between the `CombatSystem` and the `UISystem` using an `EventBus`.

## Requirements:
1. **`event_bus.py`**:
   - Implement the `publish(event_type, data)` method.
   - It should notify all listeners subscribed to the specific `event_type`.
2. **`combat_system.py`**:
   - In `deal_damage`, publish a "DamageTaken" event using the `event_bus`.
   - The event data should be a dictionary: `{"entity_id": entity_id, "damage": damage}`.
3. **`ui_system.py`**:
   - In the `__init__` method, use `self.event_bus.subscribe` to listen for the "DamageTaken" event.
4. **Decoupling**: The `CombatSystem` should have no reference to the `UISystem`.

## Files:
- `world.py`: Basic ECS registry.
- `event_bus.py`: To be completed.
- `combat_system.py`: To be completed.
- `ui_system.py`: To be completed.
- `app.py`: Entry point for simulation.
