import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  AtSign,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { validatePassword, formatHandle } from '../utils/passwordValidator';
import { sendPasswordResetOtp, verifyOTP, clearOTP } from '../services/emailService';
import {
  getAllUsers,
  saveAllUsers,
  getUserByEmail,
  getUserByHandle,
  setCurrentUser,
  inspectBanStatus,
} from '../services/storage';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'signup' | 'forgot';
  onClose: () => void;
  onSuccess: (user: User) => void;
  onBannedUserAttempt?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
  onBannedUserAttempt,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot'>(initialTab);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password flow states
  // Step 1: email, Step 2: otp, Step 3: new password
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState<string | null>(null);

  // Global error/success message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time password validations
  const signupPassValidation = validatePassword(password);
  const resetPassValidation = validatePassword(newPassword);

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTabSwitch = (tab: 'login' | 'signup' | 'forgot') => {
    setActiveTab(tab);
    resetFormState();
    if (tab === 'forgot') setForgotStep(1);
  };

  // ---------------- SIGN UP ----------------
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const formattedHandle = formatHandle(nickName);
    if (!formattedHandle || formattedHandle === '@' || formattedHandle.length < 3) {
      setErrorMessage('Nickname must be at least 2 characters following the @ (e.g. @rahin).');
      return;
    }

    // Check if handle already exists
    const existingHandle = getUserByHandle(formattedHandle);
    if (existingHandle) {
      setErrorMessage(`Nickname ${formattedHandle} is already registered. Please choose another.`);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    const existingEmail = getUserByEmail(email);
    if (existingEmail) {
      setErrorMessage('An account with this email already exists. Please log in.');
      return;
    }

    // Hard password validation
    if (!signupPassValidation.isValid) {
      setErrorMessage(
        'Password does not meet the hard password requirements. You must include special characters like $ or #, uppercase, lowercase, and numbers.'
      );
      return;
    }

    // Create user
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: fullName.trim(),
      nickName: formattedHandle,
      email: email.trim().toLowerCase(),
      password: password,
      avatarUrl: '/src/assets/images/avatar_tech_dev_1793017960598.jpg',
      bio: 'New explorer on PulseX.',
      joinedAt: new Date().toISOString(),
      role: 'user',
      isVerified: false,
      following: ['usr_rahin_admin'],
      followersCount: 0,
      banStatus: { isBanned: false, type: 'none' },
    };

    const allUsers = getAllUsers();
    allUsers.push(newUser);
    saveAllUsers(allUsers);
    setCurrentUser(newUser);

    setSuccessMessage('Account created successfully! Welcome to PulseX.');
    setTimeout(() => {
      onSuccess(newUser);
      onClose();
    }, 700);
  };

  // ---------------- LOGIN ----------------
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    const user = getUserByEmail(loginEmail);
    if (!user) {
      setErrorMessage('No account found with this email. Please check or sign up.');
      return;
    }

    if (user.password !== loginPassword) {
      setErrorMessage('Incorrect password. Click "Forgot password?" if you need to reset it.');
      return;
    }

    // Check ban status
    const banCheck = inspectBanStatus(user);
    if (banCheck.isBanned) {
      if (onBannedUserAttempt) {
        onBannedUserAttempt(user);
      }
      setErrorMessage(
        `Your account is suspended (${banCheck.type === 'permanent' ? 'Permanent' : `Expires in ${banCheck.remainingText}`}). Reason: ${banCheck.reason}`
      );
      return;
    }

    setCurrentUser(user);
    setSuccessMessage(`Welcome back, ${user.fullName}!`);
    setTimeout(() => {
      onSuccess(user);
      onClose();
    }, 500);
  };

  // ---------------- FORGOT PASSWORD FLOW ----------------
  // Step 1: Check user email & send OTP via EmailJS
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }

    const user = getUserByEmail(forgotEmail);
    if (!user) {
      setErrorMessage('No PulseX account found registered with this email address.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendPasswordResetOtp(forgotEmail, user.fullName);
      setIsSendingOtp(false);
      setOtpFeedback(res.message);
      setForgotStep(2);
    } catch (err: any) {
      setIsSendingOtp(false);
      setErrorMessage('Could not send verification code. Please try again.');
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    const verification = verifyOTP(forgotEmail, otpCode);
    if (!verification.valid) {
      setErrorMessage(verification.reason || 'Invalid OTP code.');
      return;
    }

    setSuccessMessage('Code verified! Please enter your new hard password.');
    setForgotStep(3);
  };

  // Step 3: Set New Password
  const handleSetNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!resetPassValidation.isValid) {
      setErrorMessage(
        'Password does not meet the hard password requirements. You must include special characters like $ or #, uppercase, lowercase, and numbers.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type identically.');
      return;
    }

    const allUsers = getAllUsers();
    const userIndex = allUsers.findIndex(
      (u) => u.email.trim().toLowerCase() === forgotEmail.trim().toLowerCase()
    );

    if (userIndex === -1) {
      setErrorMessage('User record not found.');
      return;
    }

    allUsers[userIndex].password = newPassword;
    saveAllUsers(allUsers);
    clearOTP(forgotEmail);

    setSuccessMessage('Password changed successfully! You can now log in.');
    setTimeout(() => {
      setLoginEmail(forgotEmail);
      setActiveTab('login');
      resetFormState();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl text-slate-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xl mb-3 shadow-lg shadow-blue-500/20">
            ⚡
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {activeTab === 'signup' && 'Create your PulseX Account'}
            {activeTab === 'login' && 'Sign in to PulseX'}
            {activeTab === 'forgot' && 'Reset your Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'signup' && 'Join the conversation. Required for creating posts & comments.'}
            {activeTab === 'login' && 'Enter your verified credentials to access your feed.'}
            {activeTab === 'forgot' && 'Secure EmailJS OTP verification flow.'}
          </p>
        </div>

        {/* Navigation Tabs (if not in forgot mode) */}
        {activeTab !== 'forgot' && (
          <div className="flex p-1 mb-5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <button
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabSwitch('signup')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* ================= TAB 1: SIGN UP ================= */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahin Kabir"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Nick Name with @ handle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Nick Name (Handle) <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-blue-400">Makes you easily found (@)</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400 font-bold text-sm">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="rahin_dev"
                  value={nickName.startsWith('@') ? nickName.slice(1) : nickName}
                  onChange={(e) => setNickName(formatHandle(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your public identity: <span className="text-slate-300 font-mono">{formatHandle(nickName) || '@yourhandle'}</span>
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Hard Password with $ or # */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Password (Hard &amp; Strong) <span className="text-red-400">*</span>
                </label>
                <span
                  className={`text-[11px] font-semibold ${
                    signupPassValidation.score >= 70
                      ? 'text-emerald-400'
                      : signupPassValidation.score >= 40
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {signupPassValidation.label}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="e.g. Secret#2026$Pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    signupPassValidation.score >= 80
                      ? 'bg-emerald-500'
                      : signupPassValidation.score >= 60
                      ? 'bg-blue-500'
                      : signupPassValidation.score >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${signupPassValidation.score}%` }}
                />
              </div>

              {/* Requirement Checklist */}
              <div className="mt-2.5 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                <p className="text-[11px] font-medium text-slate-300">Mandatory Password Rules:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 ${
                      signupPassValidation.passedRules.includes('dollar_or_hash')
                        ? 'text-emerald-400 font-medium'
                        : 'text-amber-400'
                    }`}
                  >
                    <span>{signupPassValidation.passedRules.includes('dollar_or_hash') ? '✓' : '•'}</span>
                    <span>Includes $ or # sign</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      signupPassValidation.passedRules.includes('length')
                        ? 'text-emerald-400 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>{signupPassValidation.passedRules.includes('length') ? '✓' : '•'}</span>
                    <span>Min 8 characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      signupPassValidation.passedRules.includes('uppercase')
                        ? 'text-emerald-400 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>{signupPassValidation.passedRules.includes('uppercase') ? '✓' : '•'}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      signupPassValidation.passedRules.includes('number')
                        ? 'text-emerald-400 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>{signupPassValidation.passedRules.includes('number') ? '✓' : '•'}</span>
                    <span>Number (0-9)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!signupPassValidation.isValid}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </form>
        )}

        {/* ================= TAB 2: LOGIN ================= */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    handleTabSwitch('forgot');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-400">Don't have an account yet? </span>
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                Sign Up here
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 3: FORGOT PASSWORD FLOW ================= */}
        {activeTab === 'forgot' && (
          <div className="space-y-4">
            {/* Step Progress Indicators */}
            <div className="flex items-center justify-between px-2 mb-2">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  forgotStep >= 1 ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>Email</span>
              </div>
              <div className="w-8 h-0.5 bg-slate-800" />
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  forgotStep >= 2 ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>OTP</span>
              </div>
              <div className="w-8 h-0.5 bg-slate-800" />
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  forgotStep >= 3 ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px]">
                  3
                </span>
                <span>New Pass</span>
              </div>
            </div>

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-slate-300">
                  Enter your registered account email. We will check our database and dispatch a 6-digit OTP code to verify your identity.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSendingOtp ? 'Sending OTP Code...' : 'Send Verification OTP'}</span>
                </button>
              </form>
            )}

            {/* STEP 2: Enter OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {otpFeedback && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                    {otpFeedback}
                  </div>
                )}
                <p className="text-xs text-slate-300">
                  Please enter the 6-digit OTP code dispatched for{' '}
                  <span className="text-white font-semibold">{forgotEmail}</span>.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xl font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isSendingOtp}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <span>Verify OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 3: Change Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      New Hard Password <span className="text-red-400">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        resetPassValidation.score >= 70
                          ? 'text-emerald-400'
                          : resetPassValidation.score >= 40
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {resetPassValidation.label}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="e.g. NewPass#2026$"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-400 mt-1">
                    Must include special characters like $ or #, uppercase, lowercase, &amp; numbers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm New Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!resetPassValidation.isValid || newPassword !== confirmPassword}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update Password &amp; Finish</span>
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
