import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface FoundContact {
  id: string;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
}

interface UsePhoneContactsReturn {
  checkContacts: () => Promise<FoundContact[]>;
  loading: boolean;
  matches: FoundContact[];
  permissionDenied: boolean;
  error: string | null;
  isNativePlatform: boolean;
}

// SHA-256 hash function using Web Crypto API
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const usePhoneContacts = (): UsePhoneContactsReturn => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<FoundContact[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isNativePlatform = Capacitor.isNativePlatform();

  const checkContacts = useCallback(async (): Promise<FoundContact[]> => {
    if (!isNativePlatform) {
      setError('Contact access is only available on mobile devices');
      return [];
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      // Dynamically import the Contacts plugin only on native
      const { Contacts } = await import('@capacitor-community/contacts');
      
      // Request permission
      const permissionStatus = await Contacts.requestPermissions();
      
      if (permissionStatus.contacts !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return [];
      }

      // Get contacts with emails
      const result = await Contacts.getContacts({
        projection: {
          emails: true,
          phones: true,
        },
      });

      if (!result.contacts || result.contacts.length === 0) {
        setLoading(false);
        return [];
      }

      // Extract and hash all emails
      const emailHashes: string[] = [];
      
      for (const contact of result.contacts) {
        if (contact.emails) {
          for (const email of contact.emails) {
            if (email.address) {
              const hash = await hashString(email.address);
              emailHashes.push(hash);
            }
          }
        }
      }

      if (emailHashes.length === 0) {
        setLoading(false);
        return [];
      }

      // Call edge function to find matches
      const { data, error: fnError } = await supabase.functions.invoke('find-contacts-on-app', {
        body: { emailHashes },
      });

      if (fnError) {
        console.error('Error calling find-contacts-on-app:', fnError);
        setError('Failed to check contacts');
        setLoading(false);
        return [];
      }

      const foundMatches: FoundContact[] = data?.matches || [];
      setMatches(foundMatches);
      setLoading(false);
      return foundMatches;

    } catch (err) {
      console.error('Error accessing contacts:', err);
      setError('Failed to access contacts');
      setLoading(false);
      return [];
    }
  }, [isNativePlatform]);

  return {
    checkContacts,
    loading,
    matches,
    permissionDenied,
    error,
    isNativePlatform,
  };
};
