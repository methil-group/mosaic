using System;

namespace EcsParallele
{
    public class SystemePhysique : ISysteme
    {
        public string Nom => "SystemePhysique";
        public string[] Dependances => new[] { "Collisionneur" };

        public void MettreAJour(float dt)
        {
            Console.WriteLine("Mise à jour de la physique...");
            // Travail lourd simulé
            System.Threading.Thread.Sleep(50);
        }
    }
}
