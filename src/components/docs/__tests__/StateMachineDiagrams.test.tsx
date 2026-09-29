import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { OrderStateMachineDiagram } from "../OrderStateMachineDiagram";
import { EscrowStateMachineDiagram } from "../EscrowStateMachineDiagram";
import { DisputeStateMachineDiagram } from "../DisputeStateMachineDiagram";
import { WithdrawalStateMachineDiagram } from "../WithdrawalStateMachineDiagram";
import { TopUpStateMachineDiagram } from "../TopUpStateMachineDiagram";
import { MilestoneStateMachineDiagram } from "../MilestoneStateMachineDiagram";

vi.mock("@/components/shared/MermaidDiagram", () => ({
  MermaidDiagram: ({ chart, variant }: { chart?: string; variant?: string }) => (
    <div data-testid="mermaid" data-chart={chart} data-variant={variant} />
  ),
}));

/** Render one machine and return the chart source it hands to MermaidDiagram. */
function renderChart(Component: ComponentType): string {
  const { unmount } = render(<Component />);
  const diagram = screen.getByTestId("mermaid");

  expect(diagram.getAttribute("data-variant")).toBe("framed");

  const chart = diagram.getAttribute("data-chart") ?? "";
  unmount();
  return chart;
}

describe("state machine diagrams", () => {
  it("renders the canonical Order state machine through MermaidDiagram", () => {
    const chart = renderChart(OrderStateMachineDiagram);

    // Canonical states from docs/architecture/state-machines.md (Order States)
    for (const state of [
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
    ]) {
      expect(chart).toContain(state);
    }

    // Canonical transitions
    for (const transition of [
      "[*] --> ORDER_CREATED",
      "ORDER_CREATED --> FUNDS_RESERVED",
      "ORDER_CREATED --> CLOSED",
      "FUNDS_RESERVED --> ESCROW_CREATING",
      "ESCROW_CREATING --> ESCROW_FUNDING",
      "ESCROW_FUNDING --> ESCROW_FUNDED",
      "ESCROW_FUNDED --> IN_PROGRESS",
      "IN_PROGRESS --> RELEASE_REQUESTED",
      "IN_PROGRESS --> REFUND_REQUESTED",
      "IN_PROGRESS --> DISPUTED",
      "RELEASE_REQUESTED --> RELEASED",
      "REFUND_REQUESTED --> REFUNDED",
      "DISPUTED --> RELEASED",
      "DISPUTED --> REFUNDED",
      "RELEASED --> CLOSED",
      "REFUNDED --> CLOSED",
      "CLOSED --> [*]",
    ]) {
      expect(chart).toContain(transition);
    }

    // No states that don't exist in the canonical machine
    for (const bogus of ["ESCROW_CREATED", "DISPUTING", "RESOLVED", "SPLIT"]) {
      expect(chart).not.toContain(bogus);
    }
  });

  it("renders the canonical internal Escrow state machine through MermaidDiagram", () => {
    const chart = renderChart(EscrowStateMachineDiagram);

    // Canonical states from docs/architecture/state-machines.md (Escrow States (internal))
    for (const state of [
      "CREATING",
      "CREATED",
      "FUNDING",
      "FUNDED",
      "RELEASING",
      "RELEASED",
      "REFUNDING",
      "REFUNDED",
      "DISPUTED",
    ]) {
      expect(chart).toContain(state);
    }

    // Canonical transitions
    for (const transition of [
      "[*] --> CREATING",
      "CREATING --> CREATED",
      "CREATED --> FUNDING",
      "FUNDING --> FUNDED",
      "FUNDED --> RELEASING",
      "FUNDED --> REFUNDING",
      "FUNDED --> DISPUTED",
      "RELEASING --> RELEASED",
      "REFUNDING --> REFUNDED",
      "DISPUTED --> RELEASED",
      "DISPUTED --> REFUNDED",
      "RELEASED --> [*]",
      "REFUNDED --> [*]",
    ]) {
      expect(chart).toContain(transition);
    }

    // The internal escrow machine must not drift into order-level states
    for (const bogus of [
      "IN_PROGRESS",
      "CLOSED",
      "ORDER_CREATED",
      "ESCROW_CREATING",
      "RELEASE_REQUESTED",
    ]) {
      expect(chart).not.toContain(bogus);
    }
  });

  it("renders the Dispute state machine (OPEN → UNDER_REVIEW → RESOLVED)", () => {
    const chart = renderChart(DisputeStateMachineDiagram);

    // DisputeStatus, packages/shared/src/enums/dispute-status.enum.ts
    for (const state of ["OPEN", "UNDER_REVIEW", "RESOLVED"]) {
      expect(chart).toContain(state);
    }

    for (const transition of [
      "[*] --> OPEN",
      "OPEN --> UNDER_REVIEW",
      "UNDER_REVIEW --> RESOLVED",
      "RESOLVED --> [*]",
    ]) {
      expect(chart).toContain(transition);
    }

    // `resolve` requires UNDER_REVIEW, so OPEN must not jump straight to RESOLVED.
    expect(chart).not.toContain("OPEN --> RESOLVED");

    // The order-level states the dispute freezes live on the order machine.
    for (const bogus of ["DISPUTED", "IN_PROGRESS", "CLOSED", "FULL_RELEASE"]) {
      expect(chart).not.toContain(bogus);
    }
  });

  it("renders the Withdrawal state machine with both provider paths", () => {
    const chart = renderChart(WithdrawalStateMachineDiagram);

    // WithdrawalStatus, packages/shared/src/enums/withdrawal-status.enum.ts
    for (const state of [
      "WITHDRAWAL_CREATED",
      "WITHDRAWAL_COMMITTED",
      "WITHDRAWAL_PENDING",
      "WITHDRAWAL_PENDING_USER_ACTION",
      "WITHDRAWAL_COMPLETED",
      "WITHDRAWAL_FAILED",
      "WITHDRAWAL_CANCELED",
    ]) {
      expect(chart).toContain(state);
    }

    for (const transition of [
      "[*] --> WITHDRAWAL_CREATED",
      "WITHDRAWAL_CREATED --> WITHDRAWAL_COMMITTED",
      "WITHDRAWAL_CREATED --> WITHDRAWAL_CANCELED",
      "WITHDRAWAL_CREATED --> WITHDRAWAL_COMPLETED",
      "WITHDRAWAL_CREATED --> WITHDRAWAL_FAILED",
      "WITHDRAWAL_COMMITTED --> WITHDRAWAL_PENDING",
      "WITHDRAWAL_PENDING --> WITHDRAWAL_PENDING_USER_ACTION",
      "WITHDRAWAL_PENDING --> WITHDRAWAL_COMPLETED",
      "WITHDRAWAL_PENDING --> WITHDRAWAL_FAILED",
      "WITHDRAWAL_PENDING_USER_ACTION --> WITHDRAWAL_PENDING",
      "WITHDRAWAL_PENDING_USER_ACTION --> WITHDRAWAL_FAILED",
      "WITHDRAWAL_COMPLETED --> [*]",
      "WITHDRAWAL_FAILED --> [*]",
      "WITHDRAWAL_CANCELED --> [*]",
    ]) {
      expect(chart).toContain(transition);
    }

    // Every non-terminal state is reachable, so CANCELED must have an inbound edge.
    expect(chart).toContain("WITHDRAWAL_CREATED --> WITHDRAWAL_CANCELED");

    // The withdrawal machine must not drift into top-up or order states.
    for (const bogus of ["TOPUP_", "IN_PROGRESS", "ORDER_CREATED", "DISPUTED"]) {
      expect(chart).not.toContain(bogus);
    }
  });

  it("renders the Top-up state machine", () => {
    const chart = renderChart(TopUpStateMachineDiagram);

    // TopUpStatus, packages/shared/src/enums/topup-status.enum.ts
    for (const state of [
      "TOPUP_CREATED",
      "TOPUP_AWAITING_USER_CONFIRMATION",
      "TOPUP_PROCESSING",
      "TOPUP_SUCCEEDED",
      "TOPUP_FAILED",
      "TOPUP_CANCELED",
    ]) {
      expect(chart).toContain(state);
    }

    for (const transition of [
      "[*] --> TOPUP_CREATED",
      "TOPUP_CREATED --> TOPUP_AWAITING_USER_CONFIRMATION",
      "TOPUP_AWAITING_USER_CONFIRMATION --> TOPUP_PROCESSING",
      "TOPUP_AWAITING_USER_CONFIRMATION --> TOPUP_CANCELED",
      "TOPUP_PROCESSING --> TOPUP_SUCCEEDED",
      "TOPUP_PROCESSING --> TOPUP_FAILED",
      "TOPUP_SUCCEEDED --> [*]",
      "TOPUP_FAILED --> [*]",
      "TOPUP_CANCELED --> [*]",
    ]) {
      expect(chart).toContain(transition);
    }

    // A top-up can never reach SUCCEEDED without going through PROCESSING.
    expect(chart).not.toContain("TOPUP_CREATED --> TOPUP_SUCCEEDED");
    expect(chart).not.toContain("WITHDRAWAL_");
  });

  it("renders the Milestone state machine (OPEN → COMPLETED)", () => {
    const chart = renderChart(MilestoneStateMachineDiagram);

    // MilestoneStatus, packages/shared/src/enums/milestone-status.enum.ts
    expect(chart).toContain("[*] --> OPEN");
    expect(chart).toContain("OPEN --> COMPLETED");
    expect(chart).toContain("COMPLETED --> [*]");

    // There is no cancellation path and no order-level status in this machine.
    for (const bogus of ["CANCELED", "IN_PROGRESS", "CLOSED", "DISPUTED", "REFUNDED"]) {
      expect(chart).not.toContain(bogus);
    }
  });

  it("produces mermaid that parses for every machine", async () => {
    const mermaid = await import("mermaid");

    for (const chart of [
      renderChart(OrderStateMachineDiagram),
      renderChart(EscrowStateMachineDiagram),
      renderChart(DisputeStateMachineDiagram),
      renderChart(WithdrawalStateMachineDiagram),
      renderChart(TopUpStateMachineDiagram),
      renderChart(MilestoneStateMachineDiagram),
    ]) {
      await expect(mermaid.default.parse(chart)).resolves.toBeTruthy();
    }
  });
});
