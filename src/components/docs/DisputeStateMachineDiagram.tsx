import { MermaidDiagram } from "@/components/shared/MermaidDiagram";

/**
 * Canonical Dispute state machine diagram.
 *
 * Source of truth: the dispute lifecycle implemented in the OFFER-HUB
 * Orchestrator. `ResolutionService.openDispute`
 * (`apps/api/src/modules/resolution/resolution.service.ts`) creates the
 * dispute row as `OPEN` and freezes the order; `DisputesController` /
 * `DisputesService` (`apps/api/src/modules/disputes/`) move it to
 * `UNDER_REVIEW` via `assign` and to `RESOLVED` via `resolve`. The state
 * values match `packages/shared/src/enums/dispute-status.enum.ts`.
 *
 * `assertTransition` rejects any other pair, so `OPEN` can never jump
 * straight to `RESOLVED` — `resolve` requires the dispute to already be
 * `UNDER_REVIEW`.
 *
 * Rendered through the shared MermaidDiagram pipeline so the diagram inherits
 * the docs theme (brand color tokens, light/dark mode) automatically.
 */
const DISPUTE_STATE_MACHINE_CHART = `stateDiagram-v2
    [*] --> OPEN: POST /orders/{orderId}/resolution/dispute

    OPEN --> UNDER_REVIEW: POST /disputes/{id}/assign
    UNDER_REVIEW --> RESOLVED: POST /disputes/{id}/resolve

    RESOLVED --> [*]`;

export function DisputeStateMachineDiagram() {
  return <MermaidDiagram chart={DISPUTE_STATE_MACHINE_CHART} variant="framed" />;
}

export default DisputeStateMachineDiagram;
