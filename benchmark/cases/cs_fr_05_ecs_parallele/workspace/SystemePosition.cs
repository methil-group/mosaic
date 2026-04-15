using System;

namespace EcsParallele
{
    public class SystemePosition : ISysteme
    {
        public string Nom => "SystemePosition";
        public string[] Dependances => new[] { "Position", "Velocite" };

        public void MettreAJour(float dt)
        {
            Console.WriteLine("Mise à jour des positions...");
            // Travail lourd simulé
            System.Threading.Thread.Sleep(50); 
        }
    }
}
