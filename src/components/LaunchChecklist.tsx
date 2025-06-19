
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Rocket, Users, MapPin, Shield, Camera, MessageCircle } from 'lucide-react';

const LaunchChecklist = () => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const checklistItems = [
    {
      id: 'auth',
      title: 'Authentication System',
      description: 'Users can sign up, log in, and manage their accounts',
      icon: Shield,
      completed: true
    },
    {
      id: 'profiles',
      title: 'User Profiles',
      description: 'Users can create and edit their profiles with privacy settings',
      icon: Users,
      completed: true
    },
    {
      id: 'map',
      title: 'Interactive Map',
      description: 'Google Maps integration with location saving and viewing',
      icon: MapPin,
      completed: true
    },
    {
      id: 'privacy',
      title: 'Privacy Controls',
      description: 'Public/private profiles and location sharing controls',
      icon: Shield,
      completed: true
    },
    {
      id: 'stories',
      title: 'Stories Feature',
      description: 'Users can create and view location-based stories',
      icon: Camera,
      completed: true
    },
    {
      id: 'messaging',
      title: 'Direct Messages',
      description: 'Real-time messaging between users',
      icon: MessageCircle,
      completed: true
    },
    {
      id: 'mobile',
      title: 'Mobile Optimization',
      description: 'App is optimized for mobile devices',
      icon: MapPin,
      completed: true
    }
  ];

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-600" />
            Launch Readiness Checklist
          </CardTitle>
          <CardDescription>
            App ready for friends and family testing - {completedCount}/{totalCount} features complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklistItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                      <h3 className={`font-medium ${item.completed ? 'text-green-800' : 'text-gray-800'}`}>
                        {item.title}
                      </h3>
                    </div>
                    <p className={`text-sm ${item.completed ? 'text-green-600' : 'text-gray-600'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">🎉 Ready for Beta Testing!</h3>
            <p className="text-sm text-blue-700 mb-3">
              Your app has all the core features needed for a successful launch with friends and family. 
              Users can create accounts, save locations privately or publicly, share stories, and message each other.
            </p>
            <div className="space-y-2 text-sm text-blue-600">
              <div>✅ Core functionality complete</div>
              <div>✅ Privacy controls implemented</div>
              <div>✅ Mobile-optimized interface</div>
              <div>✅ Real-time features working</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-medium text-amber-800 mb-2">📋 Next Steps for Launch</h3>
            <div className="space-y-1 text-sm text-amber-700">
              <div>1. Test with a small group of friends first</div>
              <div>2. Gather feedback on user experience</div>
              <div>3. Monitor for any bugs or issues</div>
              <div>4. Consider adding push notifications</div>
              <div>5. Plan content moderation if needed</div>
            </div>
          </div>

          <Button className="w-full mt-4" size="lg">
            <Rocket className="w-4 h-4 mr-2" />
            Ready to Launch Beta!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaunchChecklist;
