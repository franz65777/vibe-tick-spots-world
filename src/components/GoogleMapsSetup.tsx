
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GoogleMapsSetupProps {
  onApiKeySet: (apiKey: string) => void;
}

const GoogleMapsSetup = ({ onApiKeySet }: GoogleMapsSetupProps) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('google-maps-api-key', apiKey);
      onApiKeySet(apiKey);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Google Maps Setup</CardTitle>
          <CardDescription>
            Enter your Google Maps API key to enable the interactive map feature.
            Get your API key from the Google Cloud Console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter your Google Maps API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Set API Key
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onApiKeySet('demo')}
              >
                Skip (Demo)
              </Button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Visit: console.cloud.google.com → APIs & Services → Credentials
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleMapsSetup;
