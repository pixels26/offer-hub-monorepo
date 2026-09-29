import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "fs";
import matter from "gray-matter";
import { getDocBySlug, getSidebarNav } from "../mdx";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

/** Extract Mermaid source; docs render these fences through MermaidDiagram. */
const MERMAID_DIAGRAM_CHART = /```mermaid\s*([\s\S]*?)```/;

const EXPECTED_MODELS = [
  "User",
  "Balance",
  "ApiKey",
  "TopUp",
  "Order",
  "Escrow",
  "Milestone",
  "Withdrawal",
  "Dispute",
  "Wallet",
  "AuditLog",
  "WebhookEvent",
  "IdempotencyKey",
  "ProcessedTransaction",
];

/**
 * These tests verify the new data-model reference page through the real docs
 * pipeline: the same `getDocBySlug`/`getSidebarNav` helpers the site uses to
 * render pages and build the sidebar, reading the actual `content/docs` tree
 * (not a mocked fs).
 */
describe("docs/guide/data-model", () => {
  it("is a real doc page resolvable through the docs pipeline", () => {
    const doc = getDocBySlug("guide/data-model");
    expect(doc).not.toBeNull();
    expect(doc!.frontmatter.title).toBe("Data Model");
    expect(doc!.frontmatter.section).toBe("Guides");
    expect(doc!.content.length).toBeGreaterThan(100);
  });

  it("is linked from the guides sidebar via frontmatter", () => {
    const nav = getSidebarNav();
    const guides = nav.find((s) => s.section === "Guides");
    expect(guides).toBeDefined();
    expect(guides!.links.map((l) => l.slug)).toContain("guide/data-model");
  });

  it("documents every model from the Prisma schema", () => {
    const doc = getDocBySlug("guide/data-model")!;
    for (const model of EXPECTED_MODELS) {
      expect(doc.content).toContain(`### ${model}`);
    }
  });

  it("includes a shared Mermaid entity-relationship diagram of the core entities", () => {
    const doc = getDocBySlug("guide/data-model")!;
    const match = doc.content.match(MERMAID_DIAGRAM_CHART);
    expect(match).not.toBeNull();

    const chart = match![1];
    expect(chart).toContain("erDiagram");
    // Every entity that participates in the core financial flow appears.
    for (const table of [
      "users",
      "balances",
      "wallets",
      "topups",
      "withdrawals",
      "orders",
      "escrows",
      "disputes",
      "milestones",
    ]) {
      expect(chart).toContain(table);
    }
  });

  it("is a valid mermaid erDiagram that parses", async () => {
    const doc = getDocBySlug("guide/data-model")!;
    const match = doc.content.match(MERMAID_DIAGRAM_CHART);
    const mermaid = await import("mermaid");
    await expect(mermaid.default.parse(match![1])).resolves.toBeTruthy();
  }, 20_000);

  it("documents every ID prefix the API uses", () => {
    const doc = getDocBySlug("guide/data-model")!;
    const start = doc.content.indexOf("## ID Prefixes");
    const end = doc.content.indexOf("## Prisma Models");

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const section = doc.content.slice(start, end);
    for (const prefix of [
      "usr_",
      "ord_",
      "topup_",
      "esc_",
      "dsp_",
      "wd_",
      "wal_",
      "key_",
      "aud_",
      "evt_",
      "mkt_",
    ]) {
      expect(section, `missing prefix ${prefix}`).toContain(`\`${prefix}\``);
    }

    // Prefixes are documented as `<prefix>_<nanoid>`, not bare names.
    expect(section).toContain("<prefix>_<nanoid>");
  });

  it("lists the Prisma models with their table names and identifiers", () => {
    const doc = getDocBySlug("guide/data-model")!;
    const start = doc.content.indexOf("## Prisma Models");
    const end = doc.content.indexOf("## Model Reference");

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const section = doc.content.slice(start, end);
    for (const [model, table] of [
      ["User", "users"],
      ["Balance", "balances"],
      ["ApiKey", "api_keys"],
      ["Wallet", "wallets"],
      ["TopUp", "topups"],
      ["Order", "orders"],
      ["Escrow", "escrows"],
      ["Milestone", "milestones"],
      ["Withdrawal", "withdrawals"],
      ["Dispute", "disputes"],
      ["AuditLog", "audit_logs"],
      ["WebhookEvent", "webhook_events"],
      ["IdempotencyKey", "idempotency_keys"],
      ["ProcessedTransaction", "processed_transactions"],
    ] as const) {
      expect(section, `missing model row for ${model}`).toContain(
        `| \`${model}\` | \`${table}\` |`,
      );
    }
  });

  it("cross-links the state machine behind every status column", () => {
    const doc = getDocBySlug("guide/data-model")!;
    const start = doc.content.indexOf("## State Machines");

    expect(start).toBeGreaterThan(-1);

    const section = doc.content.slice(start);
    for (const link of [
      "/docs/guide/orders#order-lifecycle",
      "/docs/guide/escrow#state-machine",
      "/docs/guide/orders#milestone-state-machine",
      "/docs/guide/disputes#state-machine",
      "/docs/sdk/topups#top-up-state-machine",
      "/docs/guide/withdrawals#withdrawal-state-machine",
    ]) {
      expect(section, `missing machine link ${link}`).toContain(link);
    }
  });

  it("is cross-linked from the self-hosting guide", () => {
    const raw = fs.readFileSync(
      path.join(DOCS_DIR, "guide/self-hosting.mdx"),
      "utf-8",
    );
    const { content } = matter(raw);
    expect(content).toMatch(/\(\/docs\/guide\/data-model\)/);
  });
});
