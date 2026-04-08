import gleam/io

pub fn main() {
  io.print("Hello, Mosaic!") // Missing semicolon or similar? No, Gleam doesn't use semicolons. 
  // Let's make a real logic/syntax error for Gleam.
  // In Gleam, you can't have a function without a body or let without value.
  let x = 
  io.println("Done")
}
