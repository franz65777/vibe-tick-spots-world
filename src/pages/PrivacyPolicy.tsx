
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-500 mb-6">Last updated: December 10, 2024</p>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create an account, update your profile, 
              or communicate with us. This includes:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Account information (name, email address, username)</li>
              <li>Profile information (bio, preferences, profile picture)</li>
              <li>Location data when you choose to share it</li>
              <li>Content you create (posts, comments, reviews)</li>
              <li>Communications with us and other users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Communicate with you about products, services, offers, and events</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may share information about you as follows or as otherwise described in this Privacy Policy:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>With other users when you choose to share content publicly</li>
              <li>With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf</li>
              <li>In response to a request for information if we believe disclosure is in accordance with any applicable law</li>
              <li>If we believe your actions are inconsistent with our user agreements or policies</li>
              <li>To protect the rights, property, and safety of SPOTT or others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Location Information</h2>
            <p className="text-gray-700 leading-relaxed">
              When you use SPOTT, we may collect location information from your device. You can control the collection 
              of location information through your device settings. However, please note that disabling location services 
              may limit certain features of our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, 
              disclosure, alteration, and destruction. However, no internet or email transmission is ever fully secure or error-free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We store the information we collect about you for as long as is necessary for the purpose(s) for which we originally 
              collected it. We may retain certain information for legitimate business purposes or as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>The right to access your personal information</li>
              <li>The right to update or correct your personal information</li>
              <li>The right to delete your personal information</li>
              <li>The right to restrict or object to certain processing of your personal information</li>
              <li>The right to data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our services are not directed to children under 13, and we do not knowingly collect personal information from 
              children under 13. If we learn that we have collected personal information of a child under 13, we will take 
              steps to delete such information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the date 
              at the top of the policy and, in some cases, we may provide additional notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at privacy@spott.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
