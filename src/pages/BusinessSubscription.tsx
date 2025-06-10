
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Crown, Building, Users, BarChart3, Calendar, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BusinessSubscription = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const fromSignup = searchParams.get('from') === 'signup';
  const email = searchParams.get('email') || user?.email || '';

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // Here you would create the business account with 60-day trial
      toast.success('Business trial started! You have 60 days to explore all features.');
      
      if (fromSignup) {
        navigate('/');
      } else {
        navigate('/business');
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToFree = () => {
    toast.success('Account converted to Free User.');
    navigate('/');
  };

  const businessFeatures = [
    {
      icon: Building,
      title: 'Business Profile',
      description: 'Create and manage your business location profile'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track visits, engagement, and customer insights'
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Engage with customers and respond to reviews'
    },
    {
      icon: Calendar,
      title: 'Event Management',
      description: 'Create and promote events at your location'
    },
    {
      icon: Zap,
      title: 'Priority Support',
      description: 'Get priority customer support and assistance'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            Back
          </Button>
          {!fromSignup && (
            <Button
              variant="outline"
              onClick={handleUpgradeToFree}
              className="text-gray-600"
            >
              Keep Free Account
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Crown className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to SPOTT Business
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Take your business to the next level with our comprehensive location management platform
          </p>
        </div>

        {/* Trial Offer Card */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
          <CardHeader className="text-center">
            <Badge className="w-fit mx-auto mb-4 bg-blue-600 text-white">
              Limited Time Offer
            </Badge>
            <CardTitle className="text-3xl font-bold text-blue-900">
              60-Day Free Trial
            </CardTitle>
            <CardDescription className="text-lg text-blue-700">
              Experience all Business features completely free for 60 days
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                €29.99<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">After trial period</p>
            </div>
            
            <Button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg"
            >
              {loading ? 'Starting Trial...' : 'Start 60-Day Free Trial'}
            </Button>
            
            <p className="text-sm text-gray-500 mt-4">
              No credit card required • Cancel anytime • Downgrade to free account anytime
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Everything you need to grow your business
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border border-gray-200 hover:border-blue-300 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Choose Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4">Features</th>
                    <th className="text-center py-4 px-4">Free User</th>
                    <th className="text-center py-4 px-4 bg-blue-50 rounded-t-lg">
                      Business
                      <Badge className="ml-2 bg-blue-600 text-white">60 Days Free</Badge>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Discover & share places</td>
                    <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-3 px-4 bg-blue-50"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Social features</td>
                    <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-3 px-4 bg-blue-50"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Business profile management</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 bg-blue-50"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Analytics & insights</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 bg-blue-50"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Customer engagement tools</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 bg-blue-50"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Priority support</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 bg-blue-50"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4 text-left max-w-2xl mx-auto">
            <div>
              <h4 className="font-medium text-gray-900">What happens after the 60-day trial?</h4>
              <p className="text-gray-600 text-sm mt-1">
                You can choose to continue with the Business subscription at €29.99/month or downgrade to a free account.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm mt-1">
                Yes, you can cancel or downgrade your subscription at any time without any penalties.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Do I need a credit card for the trial?</h4>
              <p className="text-gray-600 text-sm mt-1">
                No credit card is required to start your 60-day free trial.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessSubscription;
