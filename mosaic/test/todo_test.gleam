import core/agent/todos as todo_manager
import gleeunit
import gleeunit/should

pub fn main() {
  gleeunit.main()
}

// 1. Test Valid Update & Rendering
pub fn valid_update_test() {
  let input = [
    #("Task 1", "completed", ""),
    #("Task 2", "in_progress", "Working on it"),
    #("Task 3", "pending", ""),
  ]

  let assert Ok(items) = todo_manager.update(input)

  // Verify structure
  items
  |> should.equal([
    todo_manager.TodoItem("Task 1", todo_manager.Completed, ""),
    todo_manager.TodoItem("Task 2", todo_manager.InProgress, "Working on it"),
    todo_manager.TodoItem("Task 3", todo_manager.Pending, ""),
  ])

  // Verify rendering
  todo_manager.render(items, "")
  |> should.equal(
    "[x] Task 1\n"
    <> "[>] Task 2 <- Working on it\n"
    <> "[ ] Task 3\n"
    <> "\n(1/3 completed)",
  )
}

// 1b. Test Update & Rendering with Conclusion
pub fn valid_update_with_conclusion_test() {
  let input = [#("Task 1", "completed", "")]
  let assert Ok(items) = todo_manager.update(input)

  todo_manager.render(items, "Everything went well!")
  |> should.equal(
    "[x] Task 1\n"
    <> "\n(1/1 completed)"
    <> "\n---CONCLUSION---\n"
    <> "Everything went well!",
  )
}

// 2. Test Invalid Status
pub fn invalid_status_test() {
  let input = [#("Task 1", "unknown_status", "")]
  todo_manager.update(input)
  |> should.equal(Error(todo_manager.InvalidStatus("unknown_status")))
}

// 3. Test Missing Active Form
pub fn missing_active_form_test() {
  let input = [#("Task 1", "in_progress", "")]
  todo_manager.update(input)
  |> should.equal(Error(todo_manager.MissingActiveForm))
}

// 4. Test Multiple In Progress
pub fn multiple_in_progress_test() {
  let input = [
    #("Task 1", "in_progress", "Doing 1"),
    #("Task 2", "in_progress", "Doing 2"),
  ]
  todo_manager.update(input)
  |> should.equal(Error(todo_manager.MultipleInProgress))
}

// 5. Test Missing Content
pub fn missing_content_test() {
  let input = [#("", "pending", "")]
  todo_manager.update(input)
  |> should.equal(Error(todo_manager.MissingContent))
}
