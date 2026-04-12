#!/usr/bin/env bash
# Install lsp-foam.el for Emacs lsp-mode users.
#
# Copies lsp-foam.el to ~/.emacs.d/site-lisp/ and prints the config
# snippet to add to your init file.
#
# For eglot users (Emacs 29+), no installation is needed — just add
# the config snippet printed at the end.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST_DIR="${HOME}/.emacs.d/site-lisp"

echo "==> FOAM LSP — Emacs Setup"
echo ""

# Detect FOAM project root (walk up from script location)
FOAM_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LSP_START="$FOAM_ROOT/tools/lsp-start.js"

if [ ! -f "$LSP_START" ]; then
  echo "WARNING: Could not find lsp-start.js at $LSP_START"
  echo "         You will need to adjust the paths in the config snippets below."
  LSP_START="foam3/tools/lsp-start.js"
fi

# Install lsp-foam.el for lsp-mode users
mkdir -p "$DEST_DIR"
cp "$SCRIPT_DIR/lsp-foam.el" "$DEST_DIR/lsp-foam.el"
echo "==> Copied lsp-foam.el to $DEST_DIR/"

echo ""
echo "============================================================"
echo "  Choose your setup below (eglot OR lsp-mode, not both)"
echo "============================================================"
echo ""
echo "--- Option A: eglot (built-in, Emacs 29+, zero dependencies) ---"
echo ""
echo "  Add to your init.el:"
echo ""
echo "    (with-eval-after-load 'eglot"
echo "      (add-to-list 'eglot-server-programs"
echo "                   '((js-mode js-ts-mode)"
echo "                     . (\"node\" \"$LSP_START\"))))"
echo ""
echo "    ;; Auto-start in FOAM projects (optional):"
echo "    (add-hook 'js-mode-hook"
echo "              (lambda ()"
echo "                (when (locate-dominating-file default-directory \"pom.js\")"
echo "                  (eglot-ensure))))"
echo ""
echo "--- Option B: lsp-mode (feature-rich, needs lsp-mode package) ---"
echo ""
echo "  Add to your init.el:"
echo ""
echo "    (add-to-list 'load-path \"$DEST_DIR\")"
echo "    (require 'lsp-foam)"
echo "    (add-hook 'js-mode-hook #'lsp-deferred)"
echo ""
echo "  Or with use-package:"
echo ""
echo "    (use-package lsp-foam"
echo "      :load-path \"$DEST_DIR\""
echo "      :custom"
echo "      (lsp-foam-server-command '(\"node\" \"$LSP_START\")))"
echo ""
echo "============================================================"
echo ""
echo "After adding the config, restart Emacs and open a FOAM .js file."
echo "The LSP server takes ~10-15 seconds to boot (loading all models)."
