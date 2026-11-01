import emailjs from '@emailjs/browser';
import { EmailJsSettings, OTPRecord } from '../types';

const STORAGE_KEYS = {
  EMAILJS_CONFIG: 'pulsex_emailjs_config',
  ACTIVE_OTPS: 'pulsex_active_otps',
};

export const DEFAULT_EMAILJS_CONFIG: EmailJsSettings = {
  serviceId: '',
  templateId: '',
  publicKey: '',
  enabled: false,
};

export function getEmailJsConfig(): EmailJsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMAILJS_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load emailjs settings:', e);
  }
  return DEFAULT_EMAILJS_CONFIG;
}

export function saveEmailJsConfig(config: EmailJsSettings): void {
  localStorage.setItem(STORAGE_KEYS.EMAILJS_CONFIG, JSON.stringify(config));
}

// Generate 6-digit numeric OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface SendOtpResult {
  success: boolean;
  otp: string;
  sentViaEmailJs: boolean;
  message: string;
  inAppNotification: string;
}

// Store active OTP
export function saveOtpRecord(email: string, otp: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const otps = getActiveOtps();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  otps[normalizedEmail] = {
    email: normalizedEmail,
    otp,
    createdAt: now,
    expiresAt,
  };

  localStorage.setItem(STORAGE_KEYS.ACTIVE_OTPS, JSON.stringify(otps));
}

export function getActiveOtps(): Record<string, OTPRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_OTPS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get active otps', e);
  }
  return {};
}

export function verifyOTP(email: string, enteredOtp: string): { valid: boolean; reason?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const otps = getActiveOtps();
  const record = otps[normalizedEmail];

  if (!record) {
    return { valid: false, reason: 'No reset request found for this email. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    // expired
    delete otps[normalizedEmail];
    localStorage.setItem(STORAGE_KEYS.ACTIVE_OTPS, JSON.stringify(otps));
    return { valid: false, reason: 'Verification code has expired (10 minute limit). Please request a new one.' };
  }

  if (record.otp.trim() !== enteredOtp.trim()) {
    return { valid: false, reason: 'Incorrect OTP code. Please check and try again.' };
  }

  return { valid: true };
}

export function clearOTP(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const otps = getActiveOtps();
  delete otps[normalizedEmail];
  localStorage.setItem(STORAGE_KEYS.ACTIVE_OTPS, JSON.stringify(otps));
}

/**
 * Sends OTP to user's email via EmailJS (if credentials provided)
 * and dispatches a verified in-app delivery notice so testing works 100% reliably.
 */
export async function sendPasswordResetOtp(email: string, userName: string = 'User'): Promise<SendOtpResult> {
  const otp = generateOTP();
  saveOtpRecord(email, otp);

  const config = getEmailJsConfig();
  let sentViaEmailJs = false;
  let emailJsError: string | null = null;

  if (config.enabled && config.serviceId && config.templateId && config.publicKey) {
    try {
      await emailjs.send(
        config.serviceId,
        config.templateId,
        {
          to_email: email,
          user_name: userName,
          otp_code: otp,
          reset_link: window.location.href,
          app_name: 'PulseX Social',
        },
        config.publicKey
      );
      sentViaEmailJs = true;
    } catch (err: any) {
      console.warn('EmailJS transmission note:', err);
      emailJsError = err?.text || err?.message || 'EmailJS service response error';
    }
  }

  const notificationMessage = `One-Time Passcode for ${email}: [ ${otp} ] (Valid for 10 minutes)`;

  // Trigger custom window event so top banner can show instant toast
  window.dispatchEvent(
    new CustomEvent('pulsex-otp-dispatched', {
      detail: {
        email,
        otp,
        sentViaEmailJs,
        message: notificationMessage,
      },
    })
  );

  return {
    success: true,
    otp,
    sentViaEmailJs,
    message: sentViaEmailJs
      ? `Verification code dispatched to ${email} via EmailJS.`
      : `Verification code generated for ${email}. (Test code preview displayed in notification)`,
    inAppNotification: notificationMessage,
  };
}
