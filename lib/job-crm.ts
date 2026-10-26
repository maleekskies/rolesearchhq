// Application details live in the job's existing raw_json column instead of
// adding new database columns. They are small, user-owned notes, and keeping
// them here means the feature works on the current schema without a migration.
//
// Scan updates refresh a job's raw_json from the board. run-scan.ts uses the
// helpers below to carry the `crm` object across that refresh.

export interface JobCrm {
  appliedAt: string | null;
  salary: string | null;
  contact: string | null;
  deadline: string | null;
}

const EMPTY_CRM: JobCrm = {
  appliedAt: null,
  salary: null,
  contact: null,
  deadline: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readJobCrm(raw: unknown): JobCrm {
  if (!isRecord(raw) || !isRecord(raw.crm)) return { ...EMPTY_CRM };
  const crm = raw.crm;
  return {
    appliedAt: textOrNull(crm.applied_at),
    salary: textOrNull(crm.salary),
    contact: textOrNull(crm.contact),
    deadline: textOrNull(crm.deadline),
  };
}

export function hasJobCrm(crm: JobCrm): boolean {
  return Boolean(crm.appliedAt || crm.salary || crm.contact || crm.deadline);
}

export function withJobCrm(raw: unknown, crm: JobCrm): Record<string, unknown> {
  const base = isRecord(raw) ? raw : {};
  const existing = isRecord(base.crm) ? base.crm : {};
  return {
    ...base,
    crm: {
      ...existing,
      applied_at: crm.appliedAt || null,
      salary: crm.salary || null,
      contact: crm.contact || null,
      deadline: crm.deadline || null,
    },
  };
}
