import api/routes/agent_route
import api/routes/chat
import ewe
import gleam/http
import gleam/http/response

pub fn start(port: Int) {
  ewe.new(handle_request)
  |> ewe.listening(port)
  |> ewe.start
}

fn handle_request(req: ewe.Request) -> ewe.Response {
  let res = case req.method {
    http.Options -> {
      response.new(204)
      |> response.set_body(ewe.TextData(""))
    }
    _ -> {
      case req.path {
        "/chat" -> chat.handle(req)
        "/agent" -> agent_route.handle(req)
        _ -> {
          response.new(404)
          |> response.set_body(ewe.TextData("Not Found"))
        }
      }
    }
  }

  res
  |> response.set_header("access-control-allow-origin", "*")
  |> response.set_header("access-control-allow-methods", "GET, POST, OPTIONS")
  |> response.set_header("access-control-allow-headers", "content-type")
}
