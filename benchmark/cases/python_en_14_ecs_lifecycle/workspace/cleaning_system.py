class CleaningSystem:
    def __init__(self, registry):
        self.registry = registry
        self.cleaned_count = 0
        # Register hooks
        self.registry.add_hook("on_remove", self.on_component_removed)

    def on_component_removed(self, entity, component):
        print(f"Cleaning System: Component {type(component).__name__} removed from Entity {entity.id}")
        self.cleaned_count += 1
