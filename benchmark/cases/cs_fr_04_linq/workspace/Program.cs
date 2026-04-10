using System;
using System.Collections.Generic;
using System.Linq;

namespace ProjetLinq
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var donnees = new List<int> { 1, 5, 8, 12, 15, 20, 25, 30 };
            // TÂCHE : Utilisez LINQ pour traiter ces données
            Console.WriteLine("Traitement LINQ...");
        }
    }

    public class ProcesseurDonnees
    {
        public static List<int> FiltrerDonnees(List<int> donnees)
        {
            // TÂCHE : Refactoriser avec LINQ
            var resultats = new List<int>();
            foreach (var element in donnees)
            {
                if (element > 10 && element % 2 == 0)
                {
                    resultats.Add(element * 2);
                }
            }
            return resultats;
        }
    }
}
