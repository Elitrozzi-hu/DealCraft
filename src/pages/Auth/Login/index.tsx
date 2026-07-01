import { useT } from '@/i18n';

import BlankLayout from '../../../layouts/BlankLayout';

const LoginPage = () => {
  const t = useT();

  return (
    <BlankLayout>
      <div className="w-full max-w-[380px] px-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_3px_rgba(15,27,61,0.07),0_4px_16px_rgba(15,27,61,0.05)]">
          <div className="h-[3px] bg-violet" />

          {/* Brand header */}
          <div className="flex flex-col items-center gap-1 border-b border-line px-8 py-6">
            <div className="flex flex-col leading-none">
              <div className="text-xl font-extrabold tracking-tight">
                Deal<span className="text-violet">Craft</span>
              </div>
              <div className="text-[10.5px] tracking-wide text-cold">by Humand</div>
            </div>
          </div>

          {/* Form body */}
          <div className="px-8 py-7">
            <h1 className="mb-1 text-[20px] font-extrabold tracking-tight text-ink">
              {t('auth.login.heading')}
            </h1>
            <p className="mb-6 text-[13px] leading-relaxed text-cold">
              {t('auth.login.subhead')}
            </p>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-panel px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-cold/30 hover:bg-cold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
              onClick={() => {
                window.location.href = '/api/auth/login';
              }}
            >
              <GoogleIcon />
              {t('auth.login.googleButton')}
            </button>
            <p className="mt-5 text-center text-[11.5px] text-cold/60">
              @humand.co
            </p>
          </div>
        </div>
      </div>
    </BlankLayout>
  );
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default LoginPage;
