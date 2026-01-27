import api/server
import dot_env
import gleam/erlang/process
import gleam/int
import mosaic_logger

pub fn main() {
  dot_env.load_default()

  let port = 3710

  mosaic_logger.info(
    "mosaic",
    "Starting mosaic server on http://localhost:" <> int.to_string(port),
  )
  let _ = server.start(port)

  process.sleep_forever()
}
