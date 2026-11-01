export interface PasswordRule {
  id: string;
  label: string;
  test: (pass: string) => boolean;
  required: boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    test: (pass: string) => pass.length >= 8,
    required: true,
  },
  {
    id: 'special_symbol',
    label: 'Contains special symbol ($ or # or @, !, %, etc.)',
    // Specifically checks for symbols with high emphasis on $ or #
    test: (pass: string) => /[$#@!%^&*()_+=\-[\]{};':"\\|,.<>/?~]/.test(pass),
    required: true,
  },
  {
    id: 'dollar_or_hash',
    label: 'Recommended sign like $ or # included',
    test: (pass: string) => /[$#]/.test(pass),
    required: true,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    test: (pass: string) => /[A-Z]/.test(pass),
    required: true,
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    test: (pass: string) => /[a-z]/.test(pass),
    required: true,
  },
  {
    id: 'number',
    label: 'At least one number (0-9)',
    test: (pass: string) => /[0-9]/.test(pass),
    required: true,
  },
];

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Fortress Hard';
  passedRules: string[];
  failedRules: string[];
  hasRequiredSign: boolean;
  errorMessages: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const passedRules: string[] = [];
  const failedRules: string[] = [];
  const errorMessages: string[] = [];

  PASSWORD_RULES.forEach((rule) => {
    if (rule.test(password)) {
      passedRules.push(rule.id);
    } else {
      failedRules.push(rule.id);
      if (rule.required) {
        errorMessages.push(rule.label);
      }
    }
  });

  const hasSpecial = /[$#@!%^&*()_+=\-[\]{};':"\\|,.<>/?~]/.test(password);
  const hasDollarOrHash = /[$#]/.test(password);

  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 20;
  if (hasSpecial) score += 10;
  if (hasDollarOrHash) score += 10;

  let label: PasswordValidationResult['label'] = 'Very Weak';
  if (score >= 90) label = 'Fortress Hard';
  else if (score >= 70) label = 'Strong';
  else if (score >= 50) label = 'Medium';
  else if (score >= 30) label = 'Weak';

  // Valid requires length >= 8, uppercase, lowercase, number, and MUST have a special symbol, especially $ or #
  const isValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    (hasDollarOrHash || hasSpecial);

  return {
    isValid,
    score: Math.min(score, 100),
    label,
    passedRules,
    failedRules,
    hasRequiredSign: hasDollarOrHash || hasSpecial,
    errorMessages,
  };
}

export function formatHandle(handleInput: string): string {
  // Cleans up user input to enforce @handle format
  let clean = handleInput.trim();
  if (!clean.startsWith('@')) {
    clean = '@' + clean;
  }
  // replace invalid characters except letters, numbers, underscores
  const prefix = '@';
  const body = clean.slice(1).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return prefix + body;
}
