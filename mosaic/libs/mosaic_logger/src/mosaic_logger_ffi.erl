-module(mosaic_logger_ffi).
-export([get_time/0]).

get_time() ->
    {H, M, S} = time(),
    {_, _, Ms} = os:timestamp(),
    TimeStr = io_lib:format("~2..0b:~2..0b:~2..0b.~3..0b", [H, M, S, Ms rem 1000]),
    list_to_binary(TimeStr).
