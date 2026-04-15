class SpatialHash:
    def __init__(self, cell_size):
        self.cell_size = cell_size
        self.grid = {}

    def _get_key(self, position):
        x, y = position
        return (int(x // self.cell_size), int(y // self.cell_size))

    def insert(self, entity_id, position):
        # TODO: Implement insertion
        pass

    def query(self, position):
        # TODO: Implement query for nearby entities
        return []

    def remove(self, entity_id, position):
        # TODO: Implement removal
        pass
