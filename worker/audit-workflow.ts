import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import {
  collectAuditResult,
  deliverAuditCallback,
  storeEvidence,
} from "./audit-processor";
import { completeAudit, failAudit, markAuditProcessing } from "../db/repository";
import type { AuditEnv, AuditWorkflowParams } from "./types";

export class AuditWorkflow extends WorkflowEntrypoint<
  AuditEnv,
  AuditWorkflowParams
> {
  async run(
    event: WorkflowEvent<AuditWorkflowParams>,
    step: WorkflowStep,
  ) {
    const params = event.payload;

    try {
      await step.do("mark audit processing", async () => {
        await markAuditProcessing(this.env.DB, params.auditId);
      });

      const result = await step.do(
        "collect and analyze website evidence",
        {
          retries: { backoff: "exponential", delay: "10 seconds", limit: 3 },
          timeout: "5 minutes",
        },
        async () => collectAuditResult(this.env, params),
      );

      await step.do("store normalized evidence", async () => {
        await storeEvidence(this.env, params, result);
      });

      await step.do("complete audit", async () => {
        await completeAudit(this.env.DB, params.auditId, result);
      });
    } catch (caught) {
      await step.do("record audit failure", async () => {
        const code = caught instanceof Error ? caught.message : "AUDIT_FAILED";
        await failAudit(this.env.DB, params.auditId, code);
      });
      throw caught;
    }

    await step.do(
      "deliver signed completion callback",
      {
        retries: { backoff: "exponential", delay: "30 seconds", limit: 5 },
        timeout: "2 minutes",
      },
      async () => deliverAuditCallback(this.env, params),
    );
  }
}
