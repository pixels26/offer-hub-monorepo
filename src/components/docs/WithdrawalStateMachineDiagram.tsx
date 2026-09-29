import { MermaidDiagram } from "@/components/shared/MermaidDiagram";

/**
 * Canonical Withdrawal state machine diagram.
 *
 * Source of truth: the withdrawal lifecycle implemented in the OFFER-HUB
 * Orchestrator — `WithdrawalsController` / `WithdrawalsService`
 * (`apps/api/src/modules/withdrawals/withdrawals.controller.ts`,
 * `withdrawals.service.ts`) and `CreateWithdrawalDto`
 * (`apps/api/src/modules/withdrawals/dto/create-withdrawal.dto.ts`). The state
 * values match `packages/shared/src/enums/withdrawal-status.enum.ts`.
 *
 * Two provider paths share the machine: a `crypto` (Stellar) destination
 * settles inline during `POST /withdrawals`, so it goes straight from
 * `WITHDRAWAL_CREATED` to a terminal state, while `bank` / `airtm_balance`
 * destinations are AirTM payouts that must be committed and then advanced by
 * AirTM payout webhooks.
 *
 * Rendered through the shared MermaidDiagram pipeline so the diagram inherits
 * the docs theme (brand color tokens, light/dark mode) automatically.
 */
const WITHDRAWAL_STATE_MACHINE_CHART = `stateDiagram-v2
    [*] --> WITHDRAWAL_CREATED: POST /withdrawals

    WITHDRAWAL_CREATED --> WITHDRAWAL_COMMITTED: POST /withdrawals/{id}/commit
    WITHDRAWAL_CREATED --> WITHDRAWAL_CANCELED: canceled before commit
    WITHDRAWAL_CREATED --> WITHDRAWAL_COMPLETED: crypto destination settles inline
    WITHDRAWAL_CREATED --> WITHDRAWAL_FAILED: crypto destination fails

    WITHDRAWAL_COMMITTED --> WITHDRAWAL_PENDING: AirTM accepts the payout

    WITHDRAWAL_PENDING --> WITHDRAWAL_PENDING_USER_ACTION: AirTM needs user action
    WITHDRAWAL_PENDING --> WITHDRAWAL_COMPLETED: payout.completed
    WITHDRAWAL_PENDING --> WITHDRAWAL_FAILED: payout.failed

    WITHDRAWAL_PENDING_USER_ACTION --> WITHDRAWAL_PENDING: user completes the action
    WITHDRAWAL_PENDING_USER_ACTION --> WITHDRAWAL_FAILED: payout.failed

    WITHDRAWAL_COMPLETED --> [*]
    WITHDRAWAL_FAILED --> [*]
    WITHDRAWAL_CANCELED --> [*]`;

export function WithdrawalStateMachineDiagram() {
  return <MermaidDiagram chart={WITHDRAWAL_STATE_MACHINE_CHART} variant="framed" />;
}

export default WithdrawalStateMachineDiagram;
