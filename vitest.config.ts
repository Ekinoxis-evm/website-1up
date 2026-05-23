import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Exclude agent worktrees and the standard noise directories — running tests
    // from the main worktree shouldn't sweep into sibling agent worktrees
    // (`.claude/worktrees/agent-*`) and pick up their copies of the suite.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.claude/worktrees/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
