# Migration From The Legacy Game

The former fourteen-position draft and generated winner flow has been removed from the client, server and common rules. Legacy `draftStage`, discard rounds, office slots, simulation streaming and prompt-driven outcome code are no longer runtime paths. The prompt submodule was removed from the server.

Product identity changed to 万世战线 / Aeonfront, application id `com.srcmax.aeonfront`, storage prefix `aeonfront_` and current protocol `aeonfront/2`. Repository names and remotes remain stable to protect organization links.

Legacy `game_sim_history` is not interpreted as a real result because it lacks deterministic state. It remains untouched in browser storage. Match history v1 is migrated into `aeonfront_match_history_v2`; practice entries keep complete replay state and online entries keep the authoritative public result and event stream.

Custom deck storage now uses a versioned v2 envelope with a rolling local backup. The client migrates v1 custom rows, ignores duplicated immutable preset rows, maps registered legacy card IDs, reports retired or missing cards, recovers from the backup when the primary payload is damaged, and enforces a one-megabyte / one-hundred-deck limit. Imported data is filtered to the documented fields and never replaces a same-named local deck automatically.

Character profiles and images were retained in full. Migration generates TCG configuration for every valid source record and maps images by exact stable name rather than duplicating files.
