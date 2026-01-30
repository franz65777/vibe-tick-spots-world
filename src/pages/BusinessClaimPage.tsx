import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle, Clock, XCircle } from 'lucide-react';
import BusinessClaimModal from '@/components/business/BusinessClaimModal';
import SubscriptionModal from '@/components/business/SubscriptionModal';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';

const BusinessClaimPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('business_claim_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClaims(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchClaims();

    // Poll for claim status changes every 30 seconds
    // This is more efficient than maintaining a separate channel
    const interval = setInterval(fetchClaims, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user, navigate, fetchClaims]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approvata';
      case 'rejected':
        return 'Rifiutata';
      default:
        return 'In attesa';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Business</h1>
                <p className="text-gray-500">Gestisci le tue richieste</p>
              </div>
            </div>
            <Button
              onClick={() => setShowClaimModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Nuova Richiesta
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-border rounded-xl p-4 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted" />
                        <div className="h-5 w-36 bg-muted rounded" />
                      </div>
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">Nessuna richiesta inviata</p>
              <Button
                onClick={() => setShowClaimModal(true)}
                variant="outline"
              >
                Invia la tua prima richiesta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(claim.status)}
                        <h3 className="font-semibold text-gray-900">{claim.business_name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{claim.business_type}</p>
                      <p className="text-xs text-gray-500">
                        Inviata il {new Date(claim.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          claim.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : claim.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {getStatusText(claim.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BusinessClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
      />

      {selectedClaimId && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => {
            setShowSubscriptionModal(false);
            setSelectedClaimId(null);
          }}
          claimRequestId={selectedClaimId}
        />
      )}
    </div>
  );
};

export default BusinessClaimPage;
