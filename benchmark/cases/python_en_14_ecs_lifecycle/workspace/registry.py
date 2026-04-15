from entity import Entity

class Registry:
    def __init__(self):
        self.entities = {}
        self.next_id = 1
        self.hooks = {"on_add": [], "on_remove": []}

    def create_entity(self):
        eid = self.next_id
        self.next_id += 1
        e = Entity(eid, self)
        self.entities[eid] = e
        return e

    def add_hook(self, trigger, callback):
        if trigger in self.hooks:
            self.hooks[trigger].append(callback)

    def _on_component_added(self, entity, component):
        # TODO: Trigger all "on_add" hooks
        pass

    def _on_component_removed(self, entity, component):
        # TODO: Trigger all "on_remove" hooks
        pass
