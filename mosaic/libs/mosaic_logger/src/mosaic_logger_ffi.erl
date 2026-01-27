-module(mosaic_logger_ffi).
-export([get_time/0, get_caller_info/0]).

get_time() ->
    {H, M, S} = time(),
    {_, _, Ms} = os:timestamp(),
    TimeStr = io_lib:format("~2..0b:~2..0b:~2..0b.~3..0b", [H, M, S, Ms rem 1000]),
    list_to_binary(TimeStr).

get_caller_info() ->
    try
        throw(stacktrace)
    catch
        _:_:Stack ->
            find_caller(Stack)
    end.

find_caller([]) -> {error, no_line};
find_caller([{Module, _Func, _Arity, Location} | Rest]) ->
    ModStr = atom_to_list(Module),
    % Skip our own logger modules and the erlang apply machinery
    case is_logger_module(ModStr) of
        true -> find_caller(Rest);
        false ->
            case lists:keyfind(line, 1, Location) of
                {line, Line} -> {ok, Line};
                false -> find_caller(Rest)
            end
    end.

is_logger_module("mosaic_logger" ++ _) -> true;
is_logger_module(_) -> false.
