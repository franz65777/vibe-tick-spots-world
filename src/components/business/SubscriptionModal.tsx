import React, { useState } from 'react';
import { X, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimRequestId: string;
}

const SubscriptionModal = ({ isOpen, onClose, claimRequestId }: SubscriptionModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const benefits = [
    'Dashboard Analytics completo',
    'Gestione contenuti e post promossi',
    'Notifiche push ai clienti',
    'Sistema di prenotazioni integrato',
    'Badge verificato sul profilo',
    'Supporto prioritario 24/7'
  ];

  const handleSubscribe = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create business subscription
      const { error: subError } = await supabase
        .from('business_subscriptions')
        .insert({
          user_id: user.id,
          claim_request_id: claimRequestId,
          plan_type: 'monthly',
          price: 29.99,
          status: 'active',
          start_date: new Date().toISOString(),
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (subError) throw subError;

      // Update profile to business user
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_business_user: true,
          business_verified: true,
          user_type: 'premium'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Abbonamento attivato!', {
        description: 'Benvenuto nel Business Account'
      });

      onClose();
      window.location.href = '/business';
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Errore nell\'attivazione dell\'abbonamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-2xl">Business Premium</h3>
            <div className="mt-2">
              <span className="text-4xl font-bold">€29.99</span>
              <span className="text-white/80 text-lg">/mese</span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-6 space-y-4">
          <h4 className="font-semibold text-gray-900">Cosa include:</h4>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-gray-700 text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>Garanzia soddisfatti o rimborsati</strong> entro i primi 7 giorni.
              Puoi cancellare l'abbonamento in qualsiasi momento.
            </p>
          </div>

          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base font-semibold"
          >
            {loading ? 'Attivazione...' : 'Attiva Abbonamento'}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Fatturazione mensile • Cancella quando vuoi
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
