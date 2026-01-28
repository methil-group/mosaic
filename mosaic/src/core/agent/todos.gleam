import gleam/int
import gleam/list
import gleam/string

pub type TodoStatus {
  Pending
  InProgress
  Completed
}

pub type TodoItem {
  TodoItem(content: String, status: TodoStatus, active_form: String)
}

pub type TodoError {
  MaxItemsExceeded
  MultipleInProgress
  InvalidStatus(String)
  MissingContent
  MissingActiveForm
}

const max_items = 20

pub fn update(
  items_data: List(#(String, String, String)),
) -> Result(List(TodoItem), TodoError) {
  // items_data tuple is (content, status_str, active_form)

  // 1. Parse and Validate individual items
  let parse_result =
    list.try_map(items_data, fn(data) {
      let #(content, status_str, active_form) = data
      let content = string.trim(content)
      let status_str = string.trim(status_str) |> string.lowercase
      let active_form = string.trim(active_form)

      use <- check_content(content)
      use status <- parse_status(status_str)
      use <- check_active_form(status, active_form)

      Ok(TodoItem(content, status, active_form))
    })

  use validated_items <- result_bind(parse_result)

  // 2. Global Constraints
  use <- check_max_items(validated_items)
  use <- check_single_in_progress(validated_items)

  Ok(validated_items)
}

pub fn render(items: List(TodoItem)) -> String {
  case items {
    [] -> "No todos."
    _ -> {
      let lines = list.map(items, render_item)
      let completed_count = list.count(items, fn(i) { i.status == Completed })
      let total = list.length(items)

      let summary =
        "\n\n("
        <> int.to_string(completed_count)
        <> "/"
        <> int.to_string(total)
        <> " completed)"

      string.join(lines, "\n") <> summary
    }
  }
}

// --- Helpers ---

fn result_bind(res: Result(a, e), f: fn(a) -> Result(b, e)) -> Result(b, e) {
  case res {
    Ok(val) -> f(val)
    Error(err) -> Error(err)
  }
}

fn check_content(
  content: String,
  next: fn() -> Result(TodoItem, TodoError),
) -> Result(TodoItem, TodoError) {
  case string.is_empty(content) {
    True -> Error(MissingContent)
    False -> next()
  }
}

fn parse_status(
  status_str: String,
  next: fn(TodoStatus) -> Result(TodoItem, TodoError),
) -> Result(TodoItem, TodoError) {
  case status_str {
    "pending" -> next(Pending)
    "in_progress" -> next(InProgress)
    "completed" -> next(Completed)
    _ -> Error(InvalidStatus(status_str))
  }
}

fn check_active_form(
  status: TodoStatus,
  active_form: String,
  next: fn() -> Result(TodoItem, TodoError),
) -> Result(TodoItem, TodoError) {
  case status {
    InProgress -> {
      case string.is_empty(active_form) {
        True -> Error(MissingActiveForm)
        False -> next()
      }
    }
    _ -> next()
  }
}

fn check_max_items(
  items: List(TodoItem),
  next: fn() -> Result(List(TodoItem), TodoError),
) -> Result(List(TodoItem), TodoError) {
  case list.length(items) > max_items {
    True -> Error(MaxItemsExceeded)
    False -> next()
  }
}

fn check_single_in_progress(
  items: List(TodoItem),
  next: fn() -> Result(List(TodoItem), TodoError),
) -> Result(List(TodoItem), TodoError) {
  let in_progress_count = list.count(items, fn(i) { i.status == InProgress })
  case in_progress_count > 1 {
    True -> Error(MultipleInProgress)
    False -> next()
  }
}

fn render_item(item: TodoItem) -> String {
  case item.status {
    Completed -> "[x] " <> item.content
    InProgress -> "[>] " <> item.content <> " <- " <> item.active_form
    Pending -> "[ ] " <> item.content
  }
}
