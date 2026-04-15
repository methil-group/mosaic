using System;

namespace ParallelEcs
{
    class Program
    {
        static void Main(string[] args)
        {
            var manager = new SystemManager();
            manager.AddSystem(new PositionSystem());
            manager.AddSystem(new PhysicsSystem());

            Console.WriteLine("Running ECS Update...");
            var start = DateTime.Now;
            manager.Update(1.0f / 60.0f);
            var end = DateTime.Now;
            
            Console.WriteLine($"Update finished in {(end - start).TotalMilliseconds}ms");
        }
    }
}
