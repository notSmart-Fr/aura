/**
 * Security Firewall Context Drift Sanitizer
 * Scans generated LLM output to detect and prevent unauthorized refund claims or database mutation confirmations.
 */

export function validateAndFilterOutput(text: string): string {
  // Regex to detect unauthorized transaction, refund or modification claims
  const blockedPatterns = [
    /refund/gi,
    /cancel(?:led|ing)?\s+order/gi,
    /order\s+cancel(?:led|ing)?/gi,
    /alter(?:ed|ing)?\s+data/gi,
    /update(?:d|ing)?\s+database/gi,
    /chargeback/gi,
    /database\s+mutat/gi
  ];

  let sanitized = text;
  for (const pattern of blockedPatterns) {
    sanitized = sanitized.replace(pattern, "[Security Constraint: Action Unauthorized]");
  }
  return sanitized;
}
