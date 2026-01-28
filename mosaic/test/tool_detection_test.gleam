import core/tools/detect_tools
import gleeunit
import gleeunit/should

pub fn main() {
  gleeunit.main()
}

pub fn clean_json_test() {
  let input =
    "
<tool_call>
{
  \"name\": \"run_bash\",
  \"parameters\": {
    \"command\": \"ls\"
  }
}
</tool_call>
"
  input
  |> detect_tools.detect_tool_call
  |> should.be_some
  |> should.equal(detect_tools.FoundTool(
    name: "run_bash",
    parameters: "{\"command\":\"ls\"}",
  ))
}

pub fn noisy_json_test() {
  let input =
    "
<tool_call>
<unknown>
{
  \"name\": \"run_bash\",
  \"parameters\": {
    \"command\": \"ls\"
  }
}
</unknown>
</tool_call>
"
  input
  |> detect_tools.detect_tool_call
  |> should.be_some
  |> should.equal(detect_tools.FoundTool(
    name: "run_bash",
    parameters: "{\"command\":\"ls\"}",
  ))
}

pub fn json_with_markdown_inside_test() {
  let input =
    "
<tool_call>
```json
{
  \"name\": \"run_bash\",
  \"parameters\": {
    \"command\": \"ls\"
  }
}
```
</tool_call>
"
  input
  |> detect_tools.detect_tool_call
  |> should.be_some
  |> should.equal(detect_tools.FoundTool(
    name: "run_bash",
    parameters: "{\"command\":\"ls\"}",
  ))
}
