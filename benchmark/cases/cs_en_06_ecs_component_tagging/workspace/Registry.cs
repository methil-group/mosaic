using System;
using System.Collections.Generic;

namespace TaggingEcs
{
    public class Registry
    {
        private int _nextId = 0;
        public List<int> Entities = new List<int>();
        private Dictionary<Type, Dictionary<int, object>> _components = new Dictionary<Type, Dictionary<int, object>>();

        public int CreateEntity()
        {
            int id = _nextId++;
            Entities.add(id);
            return id;
        }

        public void AddComponent<T>(int entityId, T component) where T : struct
        {
            var type = typeof(T);
            if (!_components.ContainsKey(type)) _components[type] = new Dictionary<int, object>();
            _components[type][entityId] = component;
        }

        public bool HasComponent<T>(int entityId) where T : struct
        {
            return _components.ContainsKey(typeof(T)) && _components[typeof(T)].ContainsKey(entityId);
        }
    }
}
