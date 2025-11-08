import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TermsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['terms']);

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-100 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          {t('common:back', { defaultValue: 'Back' })}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-3xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
                SPOTT
                <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
              </h1>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">{t('terms:title')}</h2>
            <p className="text-gray-600 mt-2">{t('terms:lastUpdated')}</p>
          </div>

          {/* Terms content */}
          <div className="prose max-w-none text-left">
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section1Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section1Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section2Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section2Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section3Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section3Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section4Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section4Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section5Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section5Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section6Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section6Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section7Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section7Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section8Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section8Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section9Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section9Content')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('terms:section10Title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('terms:section10Content')}
            </p>
          </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
