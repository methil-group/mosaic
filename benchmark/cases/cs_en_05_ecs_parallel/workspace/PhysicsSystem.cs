using System;

namespace ParallelEcs
{
    public class PhysicsSystem : ISystem
    {
        public string Name => "PhysicsSystem";
        public string[] Dependencies => new[] { "Collider" };

        public void Update(float dt)
        {
            Console.WriteLine("Updating Physics...");
            // Simulated heavy work
            System.Threading.Thread.Sleep(50);
        }
    }
}
