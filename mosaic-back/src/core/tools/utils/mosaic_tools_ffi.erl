-module(mosaic_tools_ffi).
-export([run_bash/2, read_file/1, write_file/2, is_port_available/1, list_directories/1, list_files/1, safe_execute/3, expand_path/1]).

run_bash(Command, Workspace) ->
    CmdStr = binary_to_list(Command),
    WorkStr = expand_path(binary_to_list(Workspace)),
    FullCmd = "cd " ++ WorkStr ++ " && " ++ CmdStr,
    Output = os:cmd(FullCmd),
    unicode:characters_to_binary(Output).

read_file(Path) ->
    PathStr = expand_path(binary_to_list(Path)),
    case file:read_file(PathStr) of
        {ok, Bin} -> Bin;
        {error, Reason} -> 
            ErrorMsg = io_lib:format("Error reading file ~s: ~p", [PathStr, Reason]),
            list_to_binary(ErrorMsg)
    end.

write_file(Path, Content) ->
    PathStr = expand_path(binary_to_list(Path)),
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
    PathStr = expand_path(binary_to_list(Path)),
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

list_files(Path) ->
    PathStr = expand_path(binary_to_list(Path)),
    Files = list_files_recursive(PathStr, ""),
    [list_to_binary(F) || F <- Files].

list_files_recursive(BaseDir, RelativePath) ->
    FullDir = filename:join(BaseDir, RelativePath),
    case file:list_dir(FullDir) of
        {ok, Filenames} ->
            lists:foldl(fun(F, Acc) ->
                Full = filename:join(FullDir, F),
                Rel = if RelativePath == "" -> F; true -> filename:join(RelativePath, F) end,
                
                % Ignore hidden files, node_modules, .git, and build artifacts
                IsHidden = case F of "." ++ _ -> true; _ -> false end,
                IsIgnored = lists:member(F, ["node_modules", ".git", "build", "dist", "_build", "deps"]),
                
                if IsHidden; IsIgnored -> Acc;
                   true ->
                     case filelib:is_dir(Full) of
                         true -> Acc ++ list_files_recursive(BaseDir, Rel);
                         false -> Acc ++ [Rel]
                     end
                end
            end, [], Filenames);
    {error, _} ->
        []
    end.

safe_execute(Function, Parameters, Workspace) ->
    try
        {ok, Function(Parameters, Workspace)}
    catch
        Error:Reason:Stacktrace ->
            Msg = io_lib:format("Crash: ~p:~p~nStacktrace: ~p", [Error, Reason, Stacktrace]),
            {error, list_to_binary(Msg)}
    end.

expand_path([$~, $/ | Rest]) -> 
    Home = os:getenv("HOME"),
    Home ++ "/" ++ Rest;
expand_path([$~]) -> 
    os:getenv("HOME");
expand_path(Path) -> 
    Path.
