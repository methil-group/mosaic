from monde import Monde
from bus_evenements import BusEvenements
from systeme_combat import SystemeCombat
from systeme_ui import SystemeUI

# Initialisation
bus = BusEvenements()
monde = Monde(bus)
combat = SystemeCombat(monde, bus)
ui = SystemeUI(bus)

# Simulation
print("--- Simulation de Combat ---")
combat.infliger_degats(1, 15)
combat.infliger_degats(2, 50)

print(f"Total des journaux UI : {len(ui.journaux)}")
if len(ui.journaux) == 2:
    print("Réussite : Le système UI a reçu tous les événements de combat.")
else:
    print("Échec : Certains événements ont été manqués.")
