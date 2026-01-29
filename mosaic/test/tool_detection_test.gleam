import core/tools/detect_tools
import gleeunit
import gleeunit/should

pub fn main() {
  gleeunit.main()
}

pub fn simple_xml_tool_test() {
  let input =
    "
<tool_call>
<name>run_bash</name>
<parameters>
<command>ls -la</command>
</parameters>
</tool_call>
"
  input
  |> detect_tools.detect_tool_call
  |> should.be_some
  |> should.equal(detect_tools.FoundTool(
    name: "run_bash",
    parameters: "{\"command\":\"ls -la\"}",
  ))
}

pub fn complex_nested_xml_test() {
  let input =
    "
<tool_call>
<name>manage_todos</name>
<parameters>
<todos>
  <task>Task 1</task>
  <status>pending</status>
  <context>Context 1</context>
</todos>
<todos>
  <task>Task 2</task>
  <status>completed</status>
  <context>Context 2</context>
</todos>
</parameters>
</tool_call>
"
  input
  |> detect_tools.detect_tool_call
  |> should.be_some
  |> should.equal(detect_tools.FoundTool(
    name: "manage_todos",
    parameters: "{\"todos\":[{\"context\":\"Context 1\",\"status\":\"pending\",\"task\":\"Task 1\"},{\"context\":\"Context 2\",\"status\":\"completed\",\"task\":\"Task 2\"}]}",
  ))
}

pub fn nested_with_wrapper_test() {
  // Testing if the model wraps list items in <item>
  // My parser groups by tag. If <todos> has <item> children:
  // {"todos": {"item": [...]}}
  // We want to verify what it produces.
  let input =
    "
<tool_call>
<name>test_tool</name>
<parameters>
<items>
  <val>A</val>
</items>
<items>
  <val>B</val>
</items>
</parameters>
</tool_call>
"
  input
  |> detect_tools.detect_tool_call
  |> should.be_some
  |> should.equal(detect_tools.FoundTool(
    name: "test_tool",
    parameters: "{\"items\":[{\"val\":\"A\"},{\"val\":\"B\"}]}",
  ))
}
