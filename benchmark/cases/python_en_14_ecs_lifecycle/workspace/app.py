from registry import Registry
from cleaning_system import CleaningSystem

class Health: pass
class Position: pass

registry = Registry()
cleaner = CleaningSystem(registry)

e = registry.create_entity()
print("Adding Health component...")
e.add_component(Health())

print("Removing Health component...")
e.remove_component("Health")

print(f"Components cleaned: {cleaner.cleaned_count}")
if cleaner.cleaned_count == 1:
    print("Success: Registry hooks triggered correctly.")
else:
    print("Failure: Registry hooks not triggered.")
