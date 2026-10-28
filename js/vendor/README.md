# Chess dependencies

The chess board uses locally hosted, pinned dependencies. No external services,
CDNs, accounts, or cross-origin isolation headers are needed. Serve the project
over HTTP(S), with `.wasm` files served as `application/wasm`.

- **chess.js 1.4.0** — BSD-2-Clause. The unmodified browser ESM build is in
  `chess/chess.js`, with its license in `chess/LICENSE`.
  Upstream: https://github.com/jhlywa/chess.js/tree/v1.4.0
- **Stockfish.js 19.0.1** — GPL-3.0. The unmodified lite single-threaded engine
  and its network are in `stockfish/`. Its GPL license is `stockfish/Copying.txt`;
  the corresponding source and build scripts are supplied in
  `stockfish/stockfish-v19.0.1-source.tar.gz`. See its bundled `README.md` for
  upstream build instructions and network provenance.
  Upstream: https://github.com/nmrugg/stockfish.js/tree/v19.0.1

Stockfish runs at Skill Level 20 with strength limiting disabled and 2.5 seconds
of search time per turn. It loads only when Chess is opened in computer mode.
It receives the internal position history for repetition-aware play. No engine
analysis, move suggestions, move indicators, or history are exposed by the UI.

Downloaded engine SHA-256 hashes:

- `stockfish-19-lite-single.js`: `ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a`
- `stockfish-19-lite-single.wasm`: `ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de`
