import { env } from "cloudflare:workers";

type CrmEvent = {
  auditId: string;
  contactName: string;
  email: string;
  event: "audit_completed";
  mobile: string;
  reportUrl: string;
  score: number;
  websiteUrl: string;
};

export async function notifyCrm(payload: CrmEvent) {
  const runtimeEnv = env as unknown as {
    CRM_WEBHOOK_SECRET?: string;
    CRM_WEBHOOK_URL?: string;
  };
  if (!runtimeEnv.CRM_WEBHOOK_URL) return;

  const response = await fetch(runtimeEnv.CRM_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(runtimeEnv.CRM_WEBHOOK_SECRET
        ? { authorization: `Bearer ${runtimeEnv.CRM_WEBHOOK_SECRET}` }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`CRM webhook returned ${response.status}`);
  }
}
