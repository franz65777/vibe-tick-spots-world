
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Crown, Check, Building, User } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Mock subscription status - in real app this would come from your backend
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isSubscribed: false,
    plan: 'free',
    trialDaysLeft: 45, // For business accounts in trial
    isBusinessAccount: true // This would be determined from user metadata
  });

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Here you would integrate with your payment processor (Stripe, etc.)
      toast.success('Redirecting to payment...');
      // Mock success
      setTimeout(() => {
        setSubscriptionStatus({
          ...subscriptionStatus,
          isSubscribed: true,
          plan: 'business'
        });
        toast.success('Subscription activated!');
        setLoading(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to process subscription');
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    setLoading(true);
    try {
      // Handle downgrade to free account
      setSubscriptionStatus({
        ...subscriptionStatus,
        isSubscribed: false,
        plan: 'free',
        isBusinessAccount: false
      });
      toast.success('Downgraded to free account');
      setLoading(false);
    } catch (error) {
      toast.error('Failed to downgrade account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center p-4">
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
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
          <p className="text-gray-600">
            {subscriptionStatus.isBusinessAccount && !subscriptionStatus.isSubscribed
              ? `You have ${subscriptionStatus.trialDaysLeft} days left in your free trial`
              : 'Select the plan that works best for you'
            }
          </p>
        </div>

        {/* Trial Warning */}
        {subscriptionStatus.isBusinessAccount && !subscriptionStatus.isSubscribed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-medium text-amber-800">Business Trial Active</h3>
                <p className="text-sm text-amber-700">
                  Your 60-day free trial expires in {subscriptionStatus.trialDaysLeft} days. 
                  Subscribe to continue using business features or downgrade to a free account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className={`relative ${subscriptionStatus.plan === 'free' ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                <CardTitle>Free User</CardTitle>
              </div>
              <CardDescription>Perfect for personal use</CardDescription>
              <div className="text-3xl font-bold">€0<span className="text-base font-normal text-gray-500">/month</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Discover amazing places</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Share your favorite spots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Follow friends</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Basic map features</span>
                </li>
              </ul>
              {subscriptionStatus.plan !== 'free' && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleDowngrade}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Downgrade to Free'}
                </Button>
              )}
              {subscriptionStatus.plan === 'free' && (
                <div className="text-center text-sm text-gray-500 font-medium">
                  Current Plan
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Plan */}
          <Card className={`relative ${subscriptionStatus.plan === 'business' ? 'ring-2 ring-blue-500' : ''}`}>
            {subscriptionStatus.trialDaysLeft > 0 && !subscriptionStatus.isSubscribed && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  60 Days Free Trial
                </span>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <CardTitle>Business</CardTitle>
              </div>
              <CardDescription>Manage and promote your location</CardDescription>
              <div className="text-3xl font-bold">
                €29.99<span className="text-base font-normal text-gray-500">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Everything in Free</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Claim your business location</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Send notifications to visitors</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Priority customer support</span>
                </li>
              </ul>
              {!subscriptionStatus.isSubscribed && subscriptionStatus.isBusinessAccount && (
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Subscribe Now'}
                </Button>
              )}
              {subscriptionStatus.isSubscribed && subscriptionStatus.plan === 'business' && (
                <div className="text-center text-sm text-gray-500 font-medium">
                  Current Plan
                </div>
              )}
              {!subscriptionStatus.isBusinessAccount && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => toast.info('Contact support to upgrade to business account')}
                >
                  Contact Sales
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">What happens after my free trial ends?</h3>
              <p className="text-gray-600 text-sm">
                After your 60-day free trial, you can choose to subscribe for €29.99/month to keep your business features, 
                or downgrade to a free personal account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription at any time. Your business features will remain active until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards and PayPal through our secure payment processor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
