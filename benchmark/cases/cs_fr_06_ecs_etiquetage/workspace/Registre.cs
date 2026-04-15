using System;
using System.Collections.Generic;

namespace EcsEtiquetage
{
    public class Registre
    {
        private int _prochainId = 0;
        public List<int> Entites = new List<int>();
        private Dictionary<Type, Dictionary<int, object>> _composants = new Dictionary<Type, Dictionary<int, object>>();

        public int CreerEntite()
        {
            int id = _prochainId++;
            Entites.Add(id);
            return id;
        }

        public void AjouterComposant<T>(int entiteId, T composant) where T : struct
        {
            var type = typeof(T);
            if (!_composants.ContainsKey(type)) _composants[type] = new Dictionary<int, object>();
            _composants[type][entiteId] = composant;
        }

        public bool PossedeComposant<T>(int entiteId) where T : struct
        {
            return _composants.ContainsKey(typeof(T)) && _composants[typeof(T)].ContainsKey(entiteId);
        }
    }
}
