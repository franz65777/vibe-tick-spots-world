
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';

const TermsPage = () => {
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
          <h2 className="text-2xl font-semibold text-gray-900">Terms of Service</h2>
          <p className="text-gray-600 mt-2">Last updated: June 11, 2025</p>
        </div>

        {/* Terms content */}
        <div className="prose max-w-none">
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h3>
            <p className="text-gray-700 mb-4">
              By accessing and using SPOTT ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h3>
            <p className="text-gray-700 mb-4">
              SPOTT is a location discovery and sharing platform that allows users to discover, share, and experience amazing places through their friends' favorite spots.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h3>
            <p className="text-gray-700 mb-4">
              To use certain features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Business Accounts and Subscriptions</h3>
            <p className="text-gray-700 mb-4">
              Business accounts are offered with a 60-day free trial period. After the trial period, business accounts require a monthly subscription of €29.99. Users may choose to downgrade to a free account at any time.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">5. User Content</h3>
            <p className="text-gray-700 mb-4">
              You retain ownership of content you post to SPOTT. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, modify, and display your content in connection with the Service.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Prohibited Uses</h3>
            <p className="text-gray-700 mb-4">
              You may not use the Service for any unlawful purpose or to solicit others to perform unlawful acts. You may not post content that is offensive, defamatory, or violates intellectual property rights.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">7. Privacy</h3>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h3>
            <p className="text-gray-700 mb-4">
              SPOTT shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h3>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Information</h3>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us at terms@spott.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
