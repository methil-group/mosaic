using System;

namespace ScriptingEcs
{
    public class ScriptComponent
    {
        // A simple delegate to simulate a script behavior
        public Action<Entity>? OnUpdate { get; set; }
    }
}
