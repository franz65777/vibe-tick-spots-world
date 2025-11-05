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
        return 'from-purple-500 to-pink-500';
      case 'discount':
        return 'from-green-500 to-emerald-500';
      case 'promotion':
        return 'from-orange-500 to-red-500';
      case 'news':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
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
    <div className="mx-4 mb-4">
      <div 
        className={`bg-gradient-to-r ${getCampaignColor()} rounded-2xl p-4 text-white shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
              {getCampaignIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-white/25 text-white border-0 text-xs font-medium backdrop-blur-sm">
                  {getCampaignTypeTranslation()}
                </Badge>
              </div>
              <h4 className="font-bold text-base leading-tight mb-1 line-clamp-2">
                {campaign.title}
              </h4>
              {!isExpanded && (
                <p className="text-white/90 text-sm line-clamp-1">
                  {campaign.description}
                </p>
              )}
            </div>
          </div>
          <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white/95 text-sm mb-3 leading-relaxed">
              {campaign.description}
            </p>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Calendar className="w-4 h-4" />
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
