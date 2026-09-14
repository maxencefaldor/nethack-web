/**
 * The engine's system configuration file, written over the embedded default
 * before the engine starts. Anything here is a runtime choice of this client,
 * not a change to the engine.
 */
export const SYSCONF = `# nethack-web sysconf
# Every browser user is a local player; wizard mode is a client decision.
WIZARDS=*
EXPLORERS=*
# "player" is the placeholder user name the worker sets when the host has no
# name yet; the engine then asks for one exactly once.
GENERICUSERS=player
MAXPLAYERS=10
HIDEUSAGE=1
PANICTRACE_GDB=0
PANICTRACE_LIBC=0
`;
