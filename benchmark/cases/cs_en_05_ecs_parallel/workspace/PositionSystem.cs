using System;

namespace ParallelEcs
{
    public class PositionSystem : ISystem
    {
        public string Name => "PositionSystem";
        public string[] Dependencies => new[] { "Position", "Velocity" };

        public void Update(float dt)
        {
            Console.WriteLine("Updating Positions...");
            // Simulated heavy work
            System.Threading.Thread.Sleep(50); 
        }
    }
}
