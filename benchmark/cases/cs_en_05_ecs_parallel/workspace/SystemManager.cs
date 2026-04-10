using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ParallelEcs
{
    public class SystemManager
    {
        private List<ISystem> _systems = new List<ISystem>();

        public void AddSystem(ISystem system)
        {
            _systems.Add(system);
        }

        public void Update(float dt)
        {
            // TODO: Implement parallel execution logic.
            // Requirement: Systems should run in parallel if possible.
            // Use Task.Run or Parallel.ForEach.
            foreach (var system in _systems)
            {
                system.Update(dt);
            }
        }
    }
}
