import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next writes its own AGENTS.md and CLAUDE.md; this repository carries its own agent
  // instructions under .claude/, and a generic generated one would sit on top of them.
  agentRules: false,
  /* config options here */
};

export default nextConfig;
