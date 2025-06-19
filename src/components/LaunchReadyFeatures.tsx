
import React, { useState } from 'react';
import { Check, X, AlertCircle, MapPin, Users, MessageSquare, Search, Bell, User, Settings } from 'lucide-react';

interface LaunchReadyFeaturesProps {
  onFeatureCheck: (feature: string, isReady: boolean) => void;
}

const LaunchReadyFeatures = ({ onFeatureCheck }: LaunchReadyFeaturesProps) => {
  const [checkedFeatures, setCheckedFeatures] = useState<Record<string, boolean>>({});

  const features = [
    {
      id: 'maps',
      name: 'Google Maps Integration',
      description: 'Maps display with location pins',
      icon: MapPin,
      status: 'ready',
      priority: 'critical'
    },
    {
      id: 'messaging',
      name: 'Real-time Messaging',
      description: 'User-to-user messaging system',
      icon: MessageSquare,
      status: 'ready',
      priority: 'critical'
    },
    {
      id: 'search',
      name: 'Search & Discovery',
      description: 'Location and user search functionality',
      icon: Search,
      status: 'ready',
      priority: 'critical'
    },
    {
      id: 'profiles',
      name: 'User Profiles',
      description: 'User profile management and viewing',
      icon: User,
      status: '90%',
      priority: 'critical'
    },
    {
      id: 'notifications',
      name: 'Push Notifications',
      description: 'Real-time notifications for user actions',
      icon: Bell,
      status: 'partial',
      priority: 'important'
    },
    {
      id: 'settings',
      name: 'App Settings',
      description: 'User preferences and app configuration',
      icon: Settings,
      status: 'missing',
      priority: 'nice-to-have'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-50';
      case '90%': return 'text-blue-600 bg-blue-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'missing': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <Check className="w-4 h-4" />;
      case '90%': return <AlertCircle className="w-4 h-4" />;
      case 'partial': return <AlertCircle className="w-4 h-4" />;
      case 'missing': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const criticalFeatures = features.filter(f => f.priority === 'critical');
  const readyCriticalFeatures = criticalFeatures.filter(f => f.status === 'ready' || f.status === '90%');
  const launchReadiness = Math.round((readyCriticalFeatures.length / criticalFeatures.length) * 100);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Launch Readiness Dashboard</h1>
          <div className="flex items-center justify-between">
            <p className="text-blue-100">Check critical features before app launch</p>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              launchReadiness >= 90 ? 'bg-green-500' : 
              launchReadiness >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {launchReadiness}% Ready
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="p-6">
          <div className="space-y-4">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    feature.priority === 'critical' 
                      ? 'border-blue-200 bg-blue-50/50' 
                      : feature.priority === 'important'
                      ? 'border-yellow-200 bg-yellow-50/50'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        feature.priority === 'critical' ? 'bg-blue-100' :
                        feature.priority === 'important' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          feature.priority === 'critical' ? 'text-blue-600' :
                          feature.priority === 'important' ? 'text-yellow-600' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {feature.name}
                          {feature.priority === 'critical' && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                              Critical
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(feature.status)}`}>
                      {getStatusIcon(feature.status)}
                      <span className="capitalize">{feature.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch Status */}
          <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Launch Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Critical Features Ready:</span>
                <span className="font-semibold">{readyCriticalFeatures.length}/{criticalFeatures.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Readiness:</span>
                <span className={`font-semibold ${launchReadiness >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {launchReadiness}%
                </span>
              </div>
            </div>
            
            {launchReadiness >= 90 ? (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Ready for Launch!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">All critical features are implemented and functional.</p>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Almost Ready</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">Complete critical features before launching.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchReadyFeatures;
