class CombatSystem:
    def __init__(self, world, event_bus):
        self.world = world
        self.event_bus = event_bus

    def deal_damage(self, entity_id, damage):
        print(f"Entity {entity_id} took {damage} damage.")
        # TODO: Publish a "DamageTaken" event to the event bus
        # Include entity_id and damage in the data.
