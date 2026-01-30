-module(agent_test_ffi).
-export([get_cwd/0]).

get_cwd() ->
    {ok, Cwd} = file:get_cwd(),
    list_to_binary(Cwd).
