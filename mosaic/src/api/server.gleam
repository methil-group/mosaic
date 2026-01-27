import api/routes/chat
import ewe
import gleam/http/response

pub fn start(port: Int) {
  ewe.new(handle_request)
  |> ewe.listening(port)
  |> ewe.start
}

fn handle_request(req: ewe.Request) -> ewe.Response {
  case req.path {
    "/chat" -> chat.handle(req)
    _ -> {
      response.new(404)
      |> response.set_body(ewe.TextData("Not Found"))
    }
  }
}
