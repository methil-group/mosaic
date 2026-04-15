using System;
using System.Collections.Generic;

namespace TaggingEcs
{
    class Program
    {
        static void Main(string[] args)
        {
            var registry = new Registry();
            var system = new TargetingSystem();

            // Create entities with various tags
            int e1 = registry.CreateEntity(); // Enemy in view, not active
            registry.AddComponent(e1, new IsEnemy());
            registry.AddComponent(e1, new InView());

            int e2 = registry.CreateEntity(); // Active enemy, in view
            registry.AddComponent(e2, new IsEnemy());
            registry.AddComponent(e2, new InView());
            registry.AddComponent(e2, new IsActive());

            int e3 = registry.CreateEntity(); // Friendly
            registry.AddComponent(e3, new InView());

            var targets = system.FindValidTargets(registry);
            Console.WriteLine($"Found {targets.Count} valid targets.");
        }
    }
}
