class UISystem:
    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.logs = []
        # TODO: Subscribe to the "DamageTaken" event
        # Use on_damage_taken as the listener.

    def on_damage_taken(self, data):
        msg = f"UI Alert: Entity {data['entity_id']} damaged by {data['damage']}"
        self.logs.append(msg)
        print(msg)
