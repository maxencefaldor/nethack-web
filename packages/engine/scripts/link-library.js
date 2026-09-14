/**
 * Emscripten JavaScript library linked into the engine.
 *
 * NetHack 5.0.0 defines get_nhuuid()/free_nhuuid() in sys/unix/unixmain.c,
 * which the WebAssembly target does not link; sys/libnh/libnhmain.c predates
 * them. Without the NHUUID feature both functions are no-ops on Unix, and
 * that is exactly what these stubs are. Upstream fix candidate.
 */
addToLibrary({
  get_nhuuid: () => {},
  free_nhuuid: () => {},
});
