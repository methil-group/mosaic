namespace EcsParallele
{
    public interface ISysteme
    {
        string Nom { get; }
        string[] Dependances { get; }
        void MettreAJour(float dt);
    }
}
