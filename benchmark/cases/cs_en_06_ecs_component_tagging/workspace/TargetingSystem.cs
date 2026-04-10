using System;
using System.Collections.Generic;

namespace TaggingEcs
{
    public class TargetingSystem
    {
        public List<int> FindValidTargets(Registry registry)
        {
            // TODO: Implement sophisticated filtering logic.
            // A valid target must:
            // 1. Have the IsEnemy tag.
            // 2. Have the InView tag.
            // 3. NOT have the IsActive tag (only target inactive orcs for example).
            return new List<int>();
        }
    }
}
