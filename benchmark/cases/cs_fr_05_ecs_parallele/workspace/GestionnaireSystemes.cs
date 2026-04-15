using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EcsParallele
{
    public class GestionnaireSystemes
    {
        private List<ISysteme> _systemes = new List<ISysteme>();

        public void AjouterSysteme(ISysteme systeme)
        {
            _systemes.Add(systeme);
        }

        public void MettreAJour(float dt)
        {
            // TÂCHE : Implémenter la logique d'exécution parallèle.
            // Exigence : Les systèmes doivent s'exécuter en parallèle si possible.
            // Utilisez Task.Run ou Parallel.ForEach.
            foreach (var systeme in _systemes)
            {
                systeme.MettreAJour(dt);
            }
        }
    }
}
