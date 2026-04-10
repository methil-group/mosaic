using System;
using System.Collections.Generic;

namespace ScriptingEcs
{
    class Program
    {
        static void Main(string[] args)
        {
            var entities = new List<Entity>();
            var e1 = new Entity(1);
            
            bool scriptRun = false;
            var script = new ScriptComponent
            {
                OnUpdate = (e) => {
                    Console.WriteLine($"Entity {e.Id} script is running!");
                    scriptRun = true;
                }
            };
            
            e1.Components.Add(script);
            entities.Add(e1);

            var loop = new UpdateLoop();
            loop.Run(entities);

            if (scriptRun) {
                Console.WriteLine("Success: Script was executed.");
            } else {
                Console.WriteLine("Failure: Script was not executed.");
            }
        }
    }
}
