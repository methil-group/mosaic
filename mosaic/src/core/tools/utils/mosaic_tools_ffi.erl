-module(mosaic_tools_ffi).
-export([run_bash/1, read_file/1, write_file/2]).

run_bash(Command) ->
    CmdStr = binary_to_list(Command),
    Output = os:cmd(CmdStr),
    list_to_binary(Output).

read_file(Path) ->
    PathStr = binary_to_list(Path),
    case file:read_file(PathStr) of
        {ok, Bin} -> Bin;
        {error, Reason} -> 
            ErrorMsg = io_lib:format("Error reading file ~s: ~p", [PathStr, Reason]),
            list_to_binary(ErrorMsg)
    end.

write_file(Path, Content) ->
    PathStr = binary_to_list(Path),
    case file:write_file(PathStr, Content) of
        ok -> <<"File written successfully">>;
        {error, Reason} ->
            ErrorMsg = io_lib:format("Error writing file ~s: ~p", [PathStr, Reason]),
            list_to_binary(ErrorMsg)
    end.
