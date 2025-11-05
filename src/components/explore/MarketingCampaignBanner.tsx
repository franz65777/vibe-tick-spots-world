import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Sparkles, Tag, Megaphone, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { MarketingCampaign } from '@/hooks/useMarketingCampaign';
import { formatDistanceToNow } from 'date-fns';
import { it, es, fr, de, pt, enUS } from 'date-fns/locale';

interface MarketingCampaignBannerProps {
  campaign: MarketingCampaign;
}

const MarketingCampaignBanner = ({ campaign }: MarketingCampaignBannerProps) => {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const getCampaignIcon = () => {
    switch (campaign.campaign_type) {
      case 'event':
        return <Sparkles className="w-4 h-4" />;
      case 'discount':
        return <Tag className="w-4 h-4" />;
      case 'promotion':
        return <Megaphone className="w-4 h-4" />;
      case 'news':
        return <Star className="w-4 h-4" />;
      default:
        return <Megaphone className="w-4 h-4" />;
    }
  };

  const getCampaignColor = () => {
    switch (campaign.campaign_type) {
      case 'event':
        return 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30';
      case 'discount':
        return 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30';
      case 'promotion':
        return 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30';
      case 'news':
        return 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30';
      default:
        return 'bg-muted/80 border-border/50';
    }
  };

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'it': return it;
      case 'es': return es;
      case 'fr': return fr;
      case 'de': return de;
      case 'pt': return pt;
      default: return enUS;
    }
  };

  const getCampaignTypeTranslation = () => {
    return t(`marketingCampaign.${campaign.campaign_type}`, { ns: 'common' });
  };

  const getTimeUntilEnd = () => {
    try {
      return formatDistanceToNow(new Date(campaign.end_date), {
        addSuffix: true,
        locale: getDateLocale()
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`${getCampaignColor()} border rounded-xl p-4 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-primary">
              {getCampaignIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs font-medium">
                  {getCampaignTypeTranslation()}
                </Badge>
              </div>
              <h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2 text-foreground">
                {campaign.title}
              </h4>
              {!isExpanded && (
                <p className="text-muted-foreground text-xs line-clamp-1">
                  {campaign.description}
                </p>
              )}
            </div>
          </div>
          <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-muted/50 rounded-full hover:bg-muted transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-foreground text-sm mb-3 leading-relaxed">
              {campaign.description}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {t('marketingCampaign.endsIn', { ns: 'common' })} {getTimeUntilEnd()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingCampaignBanner;
