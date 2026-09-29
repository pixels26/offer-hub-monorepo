import { MermaidDiagram } from "@/components/shared/MermaidDiagram";

/**
 * Canonical Milestone state machine diagram.
 *
 * Source of truth: the milestone lifecycle implemented in the OFFER-HUB
 * Orchestrator — milestones are created with their parent order
 * (`OrdersService.createOrder`) and completed one at a time through
 * `OrdersController.completeMilestone`
 * (`apps/api/src/modules/orders/{orders.controller.ts,orders.service.ts}`).
 * The state values match `packages/shared/src/enums/milestone-status.enum.ts`.
 *
 * Milestones have no independent cancellation path: they are created `OPEN`,
 * can move to `COMPLETED` exactly once, and every milestone must be
 * `COMPLETED` before the parent order can be released.
 *
 * Rendered through the shared MermaidDiagram pipeline so the diagram inherits
 * the docs theme (brand color tokens, light/dark mode) automatically.
 */
const MILESTONE_STATE_MACHINE_CHART = `stateDiagram-v2
    [*] --> OPEN: created with the parent order

    OPEN --> COMPLETED: POST /orders/{id}/milestones/{ref}/complete

    COMPLETED --> [*]`;

export function MilestoneStateMachineDiagram() {
  return <MermaidDiagram chart={MILESTONE_STATE_MACHINE_CHART} variant="framed" />;
}

export default MilestoneStateMachineDiagram;
