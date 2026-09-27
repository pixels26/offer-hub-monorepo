import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "fs";
import matter from "gray-matter";
import { getDocBySlug, getSidebarNav } from "../mdx";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

/** Optional `\r` so the fence matches both LF and Windows CRLF checkouts. */
const MERMAID_FENCE = /```mermaid\r?\n([\s\S]*?)```/g;

/**
 * Every state machine the Orchestrator enforces, with the states its enum
 * declares. Mirrors `packages/shared/src/enums/*` in the orchestrator repo —
 * the page under test is only useful if it still agrees with those enums.
 */
const MACHINES: { heading: string; states: string[] }[] = [
  {
    heading: "Order State Machine",
    states: [
      "ORDER_CREATED",
      "FUNDS_RESERVED",
      "ESCROW_CREATING",
      "ESCROW_FUNDING",
      "ESCROW_FUNDED",
      "IN_PROGRESS",
      "RELEASE_REQUESTED",
      "RELEASED",
      "REFUND_REQUESTED",
      "REFUNDED",
      "DISPUTED",
      "CLOSED",
    ],
  },
  {
    heading: "Escrow State Machine",
    states: [
      "CREATING",
      "CREATED",
      "FUNDING",
      "FUNDED",
      "RELEASING",
      "RELEASED",
      "REFUNDING",
      "REFUNDED",
      "DISPUTED",
    ],
  },
  {
    heading: "Dispute State Machine",
    states: ["OPEN", "UNDER_REVIEW", "RESOLVED"],
  },
  {
    heading: "Withdrawal State Machine",
    states: [
      "WITHDRAWAL_CREATED",
      "WITHDRAWAL_COMMITTED",
      "WITHDRAWAL_PENDING",
      "WITHDRAWAL_PENDING_USER_ACTION",
      "WITHDRAWAL_COMPLETED",
      "WITHDRAWAL_FAILED",
      "WITHDRAWAL_CANCELED",
    ],
  },
  {
    heading: "Top-up State Machine",
    states: [
      "TOPUP_CREATED",
      "TOPUP_AWAITING_USER_CONFIRMATION",
      "TOPUP_PROCESSING",
      "TOPUP_SUCCEEDED",
      "TOPUP_FAILED",
      "TOPUP_CANCELED",
    ],
  },
  {
    heading: "Milestone State Machine",
    states: ["OPEN", "COMPLETED"],
  },
];

/** Guides that document a domain and must link to the machine that governs it. */
const CROSS_LINKED_GUIDES = [
  "guide/orders",
  "guide/escrow",
  "guide/disputes",
  "guide/deposits",
  "guide/withdrawals",
  "guide/data-model",
  "guide/orchestrator",
];

/**
 * Guards the state-machine reference through the real docs pipeline: the same
 * `getDocBySlug`/`getSidebarNav` helpers the site uses, reading the actual
 * `content/docs` tree (not a mocked fs).
 */
describe("docs/guide/state-machines", () => {
  it("is a real doc page resolvable through the docs pipeline", () => {
    const doc = getDocBySlug("guide/state-machines");
    expect(doc).not.toBeNull();
    expect(doc!.frontmatter.title).toBe("State Machines");
    expect(doc!.frontmatter.section).toBe("Guides");
    expect(typeof doc!.frontmatter.order).toBe("number");
    expect(doc!.content.length).toBeGreaterThan(100);
  });

  it("is linked from the guides sidebar via frontmatter", () => {
    const guides = getSidebarNav().find((s) => s.section === "Guides");
    expect(guides).toBeDefined();
    expect(guides!.links.map((l) => l.slug)).toContain("guide/state-machines");
  });

  it("documents every domain machine and every state in its enum", () => {
    const content = getDocBySlug("guide/state-machines")!.content;

    for (const machine of MACHINES) {
      expect(content, `missing section: ${machine.heading}`).toContain(
        `## ${machine.heading}`,
      );
      for (const state of machine.states) {
        expect(content, `${machine.heading} is missing state ${state}`).toContain(
          `\`${state}\``,
        );
      }
    }
  });

  it("documents the error each illegal transition produces", () => {
    const content = getDocBySlug("guide/state-machines")!.content;
    expect(content).toContain("## State Transition Errors");
    expect(content).toContain("INVALID_STATE");
    expect(content).toContain("WITHDRAWAL_NOT_COMMITTABLE");
    expect(content).toContain("DISPUTE_ALREADY_OPEN");
  });

  it("reuses the canonical order and escrow diagram components", () => {
    const content = getDocBySlug("guide/state-machines")!.content;
    expect(content).toContain("<OrderStateMachineDiagram />");
    expect(content).toContain("<EscrowStateMachineDiagram />");
  });

  it("only ships mermaid diagrams that parse", async () => {
    const content = getDocBySlug("guide/state-machines")!.content;
    const mermaid = await import("mermaid");

    const charts = [...content.matchAll(MERMAID_FENCE)].map((m) => m[1]);
    expect(charts.length).toBeGreaterThan(0);

    for (const chart of charts) {
      await expect(mermaid.default.parse(chart)).resolves.toBeTruthy();
    }
  });

  it("is cross-linked from every guide that documents a governed domain", () => {
    for (const slug of CROSS_LINKED_GUIDES) {
      const raw = fs.readFileSync(path.join(DOCS_DIR, `${slug}.mdx`), "utf-8");
      const { content } = matter(raw);
      expect(content, `${slug} does not link to the state-machines page`).toMatch(
        /\(\/docs\/guide\/state-machines/,
      );
    }
  });
});
