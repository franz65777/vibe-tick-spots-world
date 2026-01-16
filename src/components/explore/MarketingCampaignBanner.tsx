import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MarketingCampaign } from '@/hooks/useMarketingCampaign';

// Campaign type icons
import trendingIcon from '@/assets/foam-finger.png';
import discountIcon from '@/assets/discount-icon.png';
import eventIcon from '@/assets/event-icon.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/new-icon.png';

interface MarketingCampaignBannerProps {
  campaign: MarketingCampaign;
}

// Get campaign icon based on campaign type
const getCampaignTypeIcon = (campaignType?: string): string => {
  switch (campaignType?.toLowerCase()) {
    case 'discount':
      return discountIcon;
    case 'event':
      return eventIcon;
    case 'promotion':
      return promotionIcon;
    case 'new':
    case 'news':
      return newIcon;
    case 'trending':
    default:
      return trendingIcon;
  }
};

// Get campaign type label
const getCampaignTypeLabel = (campaignType: string, t: (key: string, options?: any) => string): string => {
  switch (campaignType?.toLowerCase()) {
    case 'discount':
      return t('marketingCampaign.discount', { ns: 'common', defaultValue: 'Discount' });
    case 'event':
      return t('marketingCampaign.event', { ns: 'common', defaultValue: 'Event' });
    case 'promotion':
      return t('marketingCampaign.promotion', { ns: 'common', defaultValue: 'Promotion' });
    case 'new':
    case 'news':
      return t('marketingCampaign.news', { ns: 'common', defaultValue: 'New' });
    case 'trending':
    default:
      return t('marketingCampaign.trending', { ns: 'common', defaultValue: 'Trending' });
  }
};

const MarketingCampaignBanner = ({ campaign }: MarketingCampaignBannerProps) => {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(campaign.end_date);
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        return t('marketingCampaign.expired', { ns: 'common', defaultValue: 'Expired' });
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      // If more than 1 day, show days
      if (days > 0) {
        return `${days}d ${hours}h`;
      }
      // If less than 1 day but more than 1 hour, show hours
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      // If less than 1 hour, show minutes
      return `${minutes}m`;
    };

    const updateTime = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [campaign.end_date, i18n.language, t]);

  return (
    <div className="w-full">
      <div 
        className="bg-background/80 border border-border/40 rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Campaign Type Icon */}
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <img 
                src={getCampaignTypeIcon(campaign.campaign_type)} 
                alt="" 
                className="w-6 h-6 object-contain" 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Campaign Type Label */}
              <span className="text-xs font-medium text-muted-foreground">
                {getCampaignTypeLabel(campaign.campaign_type, t)}
              </span>
              
              {/* Campaign Title */}
              <h4 className="font-bold text-base leading-tight text-foreground text-left mt-0.5">
                {campaign.title}
              </h4>
            </div>
          </div>
          
          <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors mt-1">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-border/30">
            <p className="text-foreground text-sm leading-relaxed text-left pt-4 pb-3">
              {campaign.description}
            </p>
            
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              <span>
                {t('marketingCampaign.endsIn', { ns: 'common', defaultValue: 'Ends in' })} {timeLeft}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingCampaignBanner;