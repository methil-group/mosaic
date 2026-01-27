import gleam/int
import gleam/io
import gleam_community/ansi

pub type Level {
  Info
  Warn
  Error
  Debug
}

pub fn log(level level: Level, module module: String, message message: String) {
  let time = do_get_time()

  let line_info = case get_caller_info() {
    Ok(line) -> ":" <> int.to_string(line)
    _ -> ""
  }

  let formatted_level = case level {
    Info -> ansi.blue("[INFO]")
    Warn -> ansi.yellow("[WARN]")
    Error -> ansi.red("[ERROR]")
    Debug -> ansi.magenta("[DEBUG]")
  }

  let formatted_time = ansi.grey("[" <> time <> "]")
  let formatted_module = ansi.cyan("[" <> module <> line_info <> "]")

  io.println(
    formatted_time <> formatted_module <> formatted_level <> " " <> message,
  )
}

@external(erlang, "mosaic_logger_ffi", "get_caller_info")
fn get_caller_info() -> Result(Int, Nil)

pub fn info(module: String, message: String) {
  log(Info, module, message)
}

pub fn warn(module: String, message: String) {
  log(Warn, module, message)
}

pub fn error(module: String, message: String) {
  log(Error, module, message)
}

pub fn debug(module: String, message: String) {
  log(Debug, module, message)
}

@external(erlang, "mosaic_logger_ffi", "get_time")
fn do_get_time() -> String

@external(erlang, "mosaic_ffi", "string_inspect")
pub fn string_inspect(val: any) -> String
