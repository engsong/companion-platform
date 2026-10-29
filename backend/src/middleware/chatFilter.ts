export interface FilterResult {
  isBlocked: boolean;
  censoredContent: string;
  reasons: string[];
}

const FORBIDDEN_KEYWORDS = [
  'bcel', 'onepay', 'lapnet', 'promptpay',
  'ໂອນ', 'ບັນຊີ', 'ເລກບັນຊີ', 'ທະນາຄານ', 'ສະແກນ', 'ຄິວອາ', 'ວອດແອັບ',
  'whatsapp', 'wechat', 'line id', 'telegram', 'facebook', 'fb:',
  'bank', 'account number', 'transfer outside', 'qr code', 'scan'
];

// Matches Lao (020..., 030...), Thai (08..., 09...), or 8-16 digit bank numbers
const PHONE_AND_ACCOUNT_REGEX = /(?:\+?856\s?20\s?\d{8}|\b020\s?\d{8}\b|\b030\s?\d{7,8}\b|\b\d{4}[-\s]?\d{4}[-\s]?\d{4,8}\b|\b\d{8,16}\b)/g;

export const inspectMessageContent = (text: string): FilterResult => {
  const reasons: string[] = [];
  let censored = text;
  const lower = text.toLowerCase();

  // 1. Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (lower.includes(keyword)) {
      reasons.push(`Detected off-platform payment/contact keyword: "${keyword}"`);
      const regex = new RegExp(keyword, 'gi');
      censored = censored.replace(regex, '[***]');
    }
  }

  // 2. Check for phone numbers or bank accounts
  if (PHONE_AND_ACCOUNT_REGEX.test(text)) {
    reasons.push('Detected telephone or bank account number sequence');
    censored = censored.replace(PHONE_AND_ACCOUNT_REGEX, '[BLOCKED CONTACT/ACCOUNT]');
  }

  return {
    isBlocked: reasons.length > 0,
    censoredContent: censored,
    reasons
  };
};
