import { MermaidDiagram } from "@/components/shared/MermaidDiagram";

/**
 * Canonical Top-up state machine diagram.
 *
 * Source of truth: the AirTM top-up lifecycle implemented in the OFFER-HUB
 * Orchestrator — `TopupsController` / `TopupsService`
 * (`apps/api/src/modules/topups/topups.controller.ts`,
 * `topups.service.ts`) and `CreateTopupDto`
 * (`apps/api/src/modules/topups/dto/create-topup.dto.ts`). The state values
 * match `packages/shared/src/enums/topup-status.enum.ts`.
 *
 * The balance is credited only when the machine reaches `TOPUP_SUCCEEDED`,
 * which happens from the `payin.succeeded` webhook or from a `refresh` /
 * callback that observes it — never from the create call.
 *
 * Rendered through the shared MermaidDiagram pipeline so the diagram inherits
 * the docs theme (brand color tokens, light/dark mode) automatically.
 */
const TOPUP_STATE_MACHINE_CHART = `stateDiagram-v2
    [*] --> TOPUP_CREATED: POST /topups

    TOPUP_CREATED --> TOPUP_AWAITING_USER_CONFIRMATION: AirTM payin created
    TOPUP_AWAITING_USER_CONFIRMATION --> TOPUP_PROCESSING: user confirms payment
    TOPUP_AWAITING_USER_CONFIRMATION --> TOPUP_CANCELED: POST /topups/{id}/cancel

    TOPUP_PROCESSING --> TOPUP_SUCCEEDED: payin.succeeded webhook / refresh
    TOPUP_PROCESSING --> TOPUP_FAILED: payin.failed webhook / refresh

    TOPUP_SUCCEEDED --> [*]
    TOPUP_FAILED --> [*]
    TOPUP_CANCELED --> [*]`;

export function TopUpStateMachineDiagram() {
  return <MermaidDiagram chart={TOPUP_STATE_MACHINE_CHART} variant="framed" />;
}

export default TopUpStateMachineDiagram;
