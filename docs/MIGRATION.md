# Migration From The Legacy Game

The former fourteen-position draft and generated winner flow has been removed from the client, server and common rules. Legacy `draftStage`, discard rounds, office slots, simulation streaming and prompt-driven outcome code are no longer runtime paths. The prompt submodule was removed from the server.

Product identity changed to 万世战线 / Aeonfront, application id `com.srcmax.aeonfront`, storage prefix `aeonfront_` and protocol `aeonfront/1`. Repository names and remotes remain stable to protect organization links.

Legacy `game_sim_history` is not interpreted as a real result because it lacks deterministic state. It remains untouched in browser storage and the new client writes `aeonfront_match_history_v1`. Users can remove the old key independently after confirming it is no longer needed.

Character profiles and images were retained in full. Migration generates TCG configuration for every valid source record and maps images by exact stable name rather than duplicating files.
