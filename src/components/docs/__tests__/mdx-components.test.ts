import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { collectFilesByExtension } from "@/lib/docs/collect-files";
import { MDX_COMPONENTS } from "../mdx-components";

/**
 * `MDXRemote` compiles the docs at render time with `MDX_COMPONENTS`, so a
 * component used in an `.mdx` file but missing from that map is an undefined
 * component: the page throws while rendering (or fails `next build`) instead
 * of failing a unit test. This guards the whole docs tree against that, which
 * is how the Order/Escrow diagram components — and now the Dispute,
 * Withdrawal, Top-up, and Milestone ones — stay wired up.
 *
 * Mermaid itself is not exercised here; `StateMachineDiagrams.test.tsx` covers
 * the chart sources and their registration through the same map.
 */

vi.mock("@/components/shared/MermaidDiagram", () => ({
  MermaidDiagram: () => null,
  default: () => null,
}));

const DOCS_DIR = path.join(process.cwd(), "content/docs");

/** Strip fenced code blocks and inline code so TypeScript generics in the
 *  examples (`<Balance>`, `<Order>`, `<OFFERHUB_MASTER_KEY>`) are not read as
 *  JSX component usage. */
function stripCode(content: string): string {
  return content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function customComponentsIn(content: string): string[] {
  const names = stripCode(content).matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g);
  return [...names].map((match) => match[1]);
}

describe("docs MDX component map", () => {
  const files = collectFilesByExtension(DOCS_DIR, ".mdx");

  it("has docs to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("registers every custom component the docs reference", () => {
    const missing = new Map<string, string[]>();

    for (const file of files) {
      const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
      const { content } = matter(raw);

      for (const name of customComponentsIn(content)) {
        if (name in MDX_COMPONENTS) continue;
        const usages = missing.get(name) ?? [];
        if (!usages.includes(file)) usages.push(file);
        missing.set(name, usages);
      }
    }

    expect(
      [...missing].map(([name, usages]) => `${name} (${usages.join(", ")})`),
    ).toEqual([]);
  });

  it("registers the state machine diagrams as framed docs components", () => {
    for (const name of [
      "OrderStateMachineDiagram",
      "EscrowStateMachineDiagram",
      "MilestoneStateMachineDiagram",
      "DisputeStateMachineDiagram",
      "TopUpStateMachineDiagram",
      "WithdrawalStateMachineDiagram",
    ]) {
      expect(MDX_COMPONENTS, `missing ${name}`).toHaveProperty(name);
    }
  });

  it("renders every state machine on the page that owns it", () => {
    const expectations = [
      ["guide/orders.mdx", "<MilestoneStateMachineDiagram />"],
      ["guide/disputes.mdx", "<DisputeStateMachineDiagram />"],
      ["guide/withdrawals.mdx", "<WithdrawalStateMachineDiagram />"],
      ["sdk/topups.mdx", "<TopUpStateMachineDiagram />"],
      ["guide/orchestrator.mdx", "<OrderStateMachineDiagram />"],
      ["guide/orchestrator.mdx", "<EscrowStateMachineDiagram />"],
    ] as const;

    for (const [file, usage] of expectations) {
      const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
      expect(raw, `${file} does not render ${usage}`).toContain(usage);
    }
  });

  it("has no leftover inline mermaid copies of the shared machines", () => {
    // The four domain machines are documented once each; the guides must not
    // drift back to a hand-copied `stateDiagram-v2` block.
    const owned = [
      "guide/disputes.mdx",
      "guide/withdrawals.mdx",
      "guide/airtm.mdx",
      "sdk/topups.mdx",
      "guide/orders.mdx",
    ];

    for (const file of owned) {
      const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
      const fences = matter(raw).content.match(/```mermaid[\s\S]*?```/g) ?? [];
      for (const fence of fences) {
        expect(fence, `${file} still inlines a stateDiagram-v2 copy`).not.toContain(
          "stateDiagram-v2",
        );
      }
    }
  });
});
