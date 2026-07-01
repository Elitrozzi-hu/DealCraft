import { useT } from '@/i18n';

import BlankLayout from '../../layouts/BlankLayout';

type ReasonKey = 'missing_params' | 'auth_failed' | 'session_expired';

const AuthErrorPage = () => {
  const t = useT();
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason') as ReasonKey | null;

  const reasonKey = reason && ['missing_params', 'auth_failed', 'session_expired'].includes(reason)
    ? (`auth.error.${reason}` as const)
    : 'auth.error.fallback' as const;

  return (
    <BlankLayout>
      <div className="w-full max-w-[380px] px-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_3px_rgba(15,27,61,0.07),0_4px_16px_rgba(15,27,61,0.05)]">
          <div className="h-[3px] bg-risk" />
          <div className="px-8 py-7">
            <div className="mb-2 text-[20px] font-extrabold tracking-tight text-ink">
              {t('auth.error.title')}
            </div>
            <p className="mb-7 text-[13px] leading-relaxed text-cold">{t(reasonKey)}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full border border-violet bg-violet px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f49e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
                onClick={() => { window.location.href = '/api/auth/login'; }}
              >
                {t('auth.error.retry')}
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full border border-line bg-panel px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-cold/30 hover:bg-cold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
                onClick={() => { window.location.href = 'https://app.humand.co'; }}
              >
                {t('auth.error.goToHumand')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </BlankLayout>
  );
};

export default AuthErrorPage;
