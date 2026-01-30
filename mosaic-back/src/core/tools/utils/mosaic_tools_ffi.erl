-module(mosaic_tools_ffi).
-export([run_bash/2, read_file/1, write_file/2, is_port_available/1, list_directories/1]).

run_bash(Command, Workspace) ->
    CmdStr = binary_to_list(Command),
    WorkStr = binary_to_list(Workspace),
    FullCmd = "cd " ++ WorkStr ++ " && " ++ CmdStr,
    Output = os:cmd(FullCmd),
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

is_port_available(Port) ->
    case gen_tcp:listen(Port, [{active, false}]) of
        {ok, Socket} ->
            gen_tcp:close(Socket),
            true;
        {error, _} ->
            false
    end.

list_directories(Path) ->
    PathStr = binary_to_list(Path),
    case file:list_dir(PathStr) of
        {ok, Filenames} ->
            Dirs = lists:filter(fun(F) -> 
                Full = filename:join(PathStr, F),
                filelib:is_dir(Full)
            end, Filenames),
            [list_to_binary(D) || D <- Dirs];
        {error, _} ->
            []
    end.
