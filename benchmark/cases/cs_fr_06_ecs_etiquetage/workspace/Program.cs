using System;
using System.Collections.Generic;

namespace EcsEtiquetage
{
    class Program
    {
        static void Main(string[] args)
        {
            var registre = new Registre();
            var systeme = new SystemeCiblage();

            // Créer des entités avec diverses combinaisons d'étiquettes
            int e1 = registre.CreerEntite(); // Ennemi en vue, pas actif
            registre.AjouterComposant(e1, new EstEnnemi());
            registre.AjouterComposant(e1, new DansVue());

            int e2 = registre.CreerEntite(); // Ennemi actif, en vue
            registre.AjouterComposant(e2, new EstEnnemi());
            registre.AjouterComposant(e2, new DansVue());
            registre.AjouterComposant(e2, new EstActif());

            int e3 = registre.CreerEntite(); // Ami
            registre.AjouterComposant(e3, new DansVue());

            var cibles = systeme.TrouverCiblesValides(registre);
            Console.WriteLine($"Trouvé {cibles.Count} cibles valides.");
        }
    }
}
