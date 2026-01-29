import gleam/int
import mosaic_logger

pub fn check_port(port: Int) -> Bool {
  is_port_available(port)
}

pub fn print_port_busy_message(port: Int) {
  let port_str = int.to_string(port)
  mosaic_logger.error("mosaic", "Port " <> port_str <> " is already in use.")
  mosaic_logger.warn(
    "mosaic",
    "Help: To kill the process using this port, run:",
  )
  mosaic_logger.warn("mosaic", "    kill -9 $(lsof -t -i:" <> port_str <> ")")
}

@external(erlang, "mosaic_tools_ffi", "is_port_available")
fn is_port_available(port: Int) -> Bool
