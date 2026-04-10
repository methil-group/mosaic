import enum

class NodeStatus(enum.Enum):
    SUCCESS = 1
    FAILURE = 2
    RUNNING = 3

class Node:
    def tick(self):
        raise NotImplementedError()

class Sequence(Node):
    def __init__(self, children):
        self.children = children
    
    def tick(self):
        # TODO: Implement sequence logic (AND)
        return NodeStatus.FAILURE

class Selector(Node):
    def __init__(self, children):
        self.children = children
    
    def tick(self):
        # TODO: Implement selector logic (OR)
        return NodeStatus.FAILURE

class Task(Node):
    def __init__(self, name, action):
        self.name = name
        self.action = action
    
    def tick(self):
        return self.action()
