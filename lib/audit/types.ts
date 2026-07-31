export type CheckResult = {
  evidence: string;
  key: string;
  label: string;
  passed: boolean;
  points: number;
  weight: number;
};

export type ScoreCategory = {
  earned: number;
  key: "technical" | "answerReadiness" | "trustConversion";
  label: string;
  maximum: number;
};

export type Finding = {
  evidence: string;
  evidenceKeys: string[];
  impact: string;
  priority: "High" | "Medium" | "Low";
  recommendation: string;
  title: string;
};

export type AuditResult = {
  analysisMode: "rules-only" | "workers-ai";
  auditedAt: string;
  categories: ScoreCategory[];
  checks: CheckResult[];
  finalUrl: string;
  findings: Finding[];
  homepageTitle: string | null;
  methodologyVersion: string;
  narrativeModel: string | null;
  pagesAudited: Array<{
    status: number;
    title: string | null;
    url: string;
  }>;
  score: number;
  summary: string;
};
