export enum CandidateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPLOYED = 'deployed',
  BLACKLISTED = 'blacklisted',
}

export enum CompletionStatus {
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
}

export enum InterestStatus {
  NOT_CONTACTED = 'not_contacted',
  CONTACTED_INTERESTED = 'contacted_interested',
  CONTACTED_NOT_INTERESTED = 'contacted_not_interested',
  CONTACTED_NOT_REACHABLE = 'contacted_not_reachable',
  CONTACTED_MAYBE_LATER = 'contacted_maybe_later',
  LINED_UP = 'lined_up',
  INTERVIEW_SELECTED = 'interview_selected',
  INTERVIEW_REJECTED = 'interview_rejected',
  INTERVIEW_ON_HOLD = 'interview_on_hold',
}

export enum ProcessStep {
  SELECTION_CONFIRMATION = 1,
  DOCUMENT_COLLECTION = 2,
  MEDICAL = 3,
  VISA_STAMPING = 4,
  PAYMENT_COLLECTION = 5,
  DEPLOYMENT = 6,
}

export enum ProcessStepStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  FAILED = 'failed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WAIVED = 'waived',
}

export enum PaymentMethod {
  CASH = 'cash',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
}

export enum JobStatus {
  OPEN = 'open',
  INTERVIEWS_SCHEDULED = 'interviews_scheduled',
  IN_PROCESS = 'in_process',
  CLOSED = 'closed',
  ON_HOLD = 'on_hold',
}

export enum RegistrationMode {
  WALK_IN = 'walk_in',
  PHONE = 'phone',
  ONLINE = 'online',
  REFERRAL = 'referral',
  CAMP = 'camp',
}

export enum CallOutcome {
  REACHED = 'reached',
  VOICEMAIL = 'voicemail',
  WRONG_NUMBER = 'wrong_number',
  LINE_BUSY = 'line_busy',
  NOT_REACHABLE = 'not_reachable',
  SWITCHED_OFF = 'switched_off',
}

export enum DropoutReason {
  OTHER_OFFER = 'other_offer',
  FAMILY_PRESSURE = 'family_pressure',
  FINANCIAL_ISSUES = 'financial_issues',
  MEDICAL_UNFIT = 'medical_unfit',
  VISA_REJECTED = 'visa_rejected',
  SALARY_MISMATCH = 'salary_mismatch',
  PERSONAL_REASONS = 'personal_reasons',
  OTHER = 'other',
}
