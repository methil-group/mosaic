-module(mosaic_ffi).
-export([stream_request/4, string_inspect/1]).

stream_request(URL, Headers, Body, Callback) ->
    % Convert Gleam headers ([#(Binary, Binary)]) to Erlang headers ([{String, String}])
    ErlHeaders = [{binary_to_list(K), binary_to_list(V)} || {K, V} <- Headers],
    Request = {binary_to_list(URL), ErlHeaders, "application/json", Body},
    HttpOptions = [],
    Options = [{stream, self}, {sync, false}],
    case httpc:request(post, Request, HttpOptions, Options) of
        {ok, RequestId} ->
            loop(RequestId, Callback);
        {error, Reason} ->
            {error, Reason}
    end.

loop(RequestId, Callback) ->
    receive
        {http, {RequestId, stream_start, _Headers}} ->
            loop(RequestId, Callback);
        {http, {RequestId, stream, BinBodyPart}} ->
            Callback(BinBodyPart),
            loop(RequestId, Callback);
        {http, {RequestId, stream_end, _Headers}} ->
            ok;
        {http, {RequestId, {error, Reason}}} ->
            {error, Reason}
    after 60000 ->
        {error, timeout}
    end.

string_inspect(Val) ->
    iolist_to_binary(io_lib:format("~p", [Val])).
