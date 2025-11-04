import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Building2, Mail, Phone, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BusinessRequest {
  id: string;
  user_id: string;
  location_id: string;
  business_name: string;
  business_type: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const AdminBusinessRequestsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<BusinessRequest | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-business-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_claim_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BusinessRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // 1. Update the claim request status
      const { error: updateError } = await supabase
        .from('business_claim_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 2. Create/update business profile
      const { error: profileError } = await supabase
        .from('business_profiles')
        .upsert({
          user_id: request.user_id,
          business_name: request.business_name,
          business_type: request.business_type,
          business_description: request.description,
          phone_number: request.contact_phone,
          verification_status: 'verified',
        }, {
          onConflict: 'user_id',
        });

      if (profileError) throw profileError;

      // 3. Update location claimed_by if location_id exists
      if (request.location_id) {
        const { error: locationError } = await supabase
          .from('locations')
          .update({ claimed_by: request.user_id })
          .eq('id', request.location_id);

        if (locationError) throw locationError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-requests'] });
      toast.success('Business request approved successfully');
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error('Failed to approve request: ' + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('business_claim_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-requests'] });
      toast.success('Business request rejected');
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error('Failed to reject request: ' + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Business Account Requests
            </h1>
            <p className="text-muted-foreground">Review and approve business account applications</p>
          </div>
        </div>

        <div className="grid gap-4">
          {requests?.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{request.business_name}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Type: {request.business_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{request.contact_email}</span>
                  </div>
                  {request.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{request.contact_phone}</span>
                    </div>
                  )}
                </div>

                {request.description && (
                  <div className="flex gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{request.description}</p>
                  </div>
                )}
              </div>

              {request.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => approveMutation.mutate(request.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => rejectMutation.mutate(request.id)}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}

          {requests && requests.length === 0 && (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
              <p className="text-muted-foreground">Business account requests will appear here</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBusinessRequestsPage;
