using System;
using System.Collections.Generic;
using System.Linq;

namespace LinqProject
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var data = new List<int> { 1, 5, 8, 12, 15, 20, 25, 30 };
            // TASK: Use LINQ to process this data
            Console.WriteLine("LINQ Processing...");
        }
    }

    public class DataProcessor
    {
        public static List<int> GetFilteredData(List<int> data)
        {
            // TODO: Refactor using LINQ
            var results = new List<int>();
            foreach (var item in data)
            {
                if (item > 10 && item % 2 == 0)
                {
                    results.Add(item * 2);
                }
            }
            return results;
        }
    }
}
