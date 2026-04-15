namespace ParallelEcs
{
    public interface ISystem
    {
        string Name { get; }
        // Defines which component types this system needs (read or write)
        string[] Dependencies { get; }
        void Update(float dt);
    }
}
