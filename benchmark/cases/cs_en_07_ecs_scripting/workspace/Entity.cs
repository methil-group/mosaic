using System;
using System.Collections.Generic;

namespace ScriptingEcs
{
    public class Entity
    {
        public int Id { get; set; }
        public List<object> Components { get; } = new List<object>();

        public Entity(int id) { Id = id; }
    }
}
