class Entity:
    def __init__(self, id, registry):
        self.id = id
        self.registry = registry
        self.components = {}

    def add_component(self, component):
        comp_type = type(component).__name__
        self.components[comp_type] = component
        # Notify the registry about the addition
        self.registry._on_component_added(self, component)

    def remove_component(self, comp_type_name):
        if comp_type_name in self.components:
            component = self.components.pop(comp_type_name)
            # Notify the registry about the removal
            self.registry._on_component_removed(self, component)
