import api/server
import core/utils/port_utils
import dot_env
import gleam/erlang/process
import gleam/int
import mosaic_logger

pub fn main() {
  dot_env.load_default()

  let port = 3710

  case port_utils.check_port(port) {
    True -> {
      mosaic_logger.info(
        "mosaic",
        "Starting mosaic server on http://localhost:" <> int.to_string(port),
      )
      let _ = server.start(port)
      process.sleep_forever()
    }
    False -> {
      port_utils.print_port_busy_message(port)
    }
  }
}
