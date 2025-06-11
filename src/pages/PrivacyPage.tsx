
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
              SPOTT
              <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Privacy Policy</h2>
          <p className="text-gray-600 mt-2">Last updated: June 11, 2025</p>
        </div>

        {/* Privacy content */}
        <div className="prose max-w-none">
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h3>
            <p className="text-gray-700 mb-4">
              We collect information you provide directly to us, such as when you create an account, post content, or contact us. This includes your name, email address, username, and any content you share.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Location Information</h3>
            <p className="text-gray-700 mb-4">
              With your permission, we may collect location information to help you discover places near you and to enhance your experience with location-based features.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h3>
            <p className="text-gray-700 mb-4">
              We use the information we collect to provide, maintain, and improve our services, communicate with you, and personalize your experience.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h3>
            <p className="text-gray-700 mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Business Account Data</h3>
            <p className="text-gray-700 mb-4">
              For business accounts, we may collect additional information such as business name, type, and payment information for subscription billing purposes.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Data Security</h3>
            <p className="text-gray-700 mb-4">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h3>
            <p className="text-gray-700 mb-4">
              We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns on our platform.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights</h3>
            <p className="text-gray-700 mb-4">
              You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h3>
            <p className="text-gray-700 mb-4">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to Privacy Policy</h3>
            <p className="text-gray-700 mb-4">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Us</h3>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy, please contact us at privacy@spott.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
