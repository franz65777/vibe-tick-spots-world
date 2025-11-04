import React from 'react';
import { useBusinessBadges } from '@/hooks/useBusinessBadges';
import { useTranslation } from 'react-i18next';

interface Props {
  locationId?: string | null;
  googlePlaceId?: string | null;
}

const BusinessBadges: React.FC<Props> = ({ locationId, googlePlaceId }) => {
  const { t } = useTranslation();
  const { loading, badges } = useBusinessBadges({ locationId, googlePlaceId });

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('badgesComingSoon', { ns: 'business', defaultValue: 'Business badges coming soon' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">
        {t('businessBadgesTitle', { ns: 'business', defaultValue: 'Business Badges' })}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-xl border bg-card p-3 flex flex-col items-center text-center transition transform hover:scale-[1.01] ${
              b.earned ? 'border-primary/40 shadow-sm' : 'border-border'
            }`}
          >
            <div className={`text-2xl mb-1 ${b.earned ? '' : 'opacity-60'}`}>{b.icon}</div>
            <div className={`text-xs font-medium text-foreground line-clamp-2 ${b.earned ? '' : 'text-muted-foreground'}`}>
              {b.name}
            </div>
            {b.max && b.progress !== undefined && (
              <div className="w-full mt-2">
                <div className="w-full h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.round((b.progress / b.max) * 100))}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {b.progress}/{b.max}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessBadges;
