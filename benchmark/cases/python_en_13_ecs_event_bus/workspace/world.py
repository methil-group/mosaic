class World:
    def __init__(self, event_bus):
        self.entities = {}
        self.event_bus = event_bus
        self.next_id = 1

    def create_entity(self):
        eid = self.next_id
        self.next_id += 1
        self.entities[eid] = {}
        return eid

    def add_component(self, eid, component):
        comp_type = type(component).__name__
        self.entities[eid][comp_type] = component
