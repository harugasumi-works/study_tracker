// Shared React hook shortcuts.
//
// This MUST be the first script loaded. Every other file in this app is a
// plain classic <script> (no ES modules, no bundler — Babel standalone
// transforms JSX in the browser at load time). Classic scripts on the same
// page share one top-level lexical scope, so a `const` declared here is
// visible to every script loaded after it without re-importing anything —
// but redeclaring it in more than one file would throw a SyntaxError. Keep
// this destructure here and nowhere else.
const { useState, useEffect, useCallback } = React;
