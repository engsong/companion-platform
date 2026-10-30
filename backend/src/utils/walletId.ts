/**
 * Helper to generate a unique Wallet ID
 * Format: CPW-XXXX-XXXX-XXXX-XXXX (23 characters alphanumeric, <= 32 max length)
 * Characters used: uppercase letters (A-Z) and numbers (2-9), excluding confusing chars
 */
export function generateWalletId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const parts: string[] = [];
  for (let p = 0; p < 4; p++) {
    let segment = '';
    for (let c = 0; c < 4; c++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    parts.push(segment);
  }
  return `CPW-${parts.join('-')}`;
}
