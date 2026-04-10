using System;

namespace EcsParallele
{
    class Program
    {
        static void Main(string[] args)
        {
            var gestionnaire = new GestionnaireSystemes();
            gestionnaire.AjouterSysteme(new SystemePosition());
            gestionnaire.AjouterSysteme(new SystemePhysique());

            Console.WriteLine("Exécution de la mise à jour ECS...");
            var debut = DateTime.Now;
            gestionnaire.MettreAJour(1.0f / 60.0f);
            var fin = DateTime.Now;
            
            Console.WriteLine($"Mise à jour terminée en {(fin - debut).TotalMilliseconds}ms");
        }
    }
}
