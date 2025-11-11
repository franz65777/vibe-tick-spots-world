import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CheckCircle, XCircle, Clock, Building2, Mail, Phone, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  user_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface AdminBusinessRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminBusinessRequestsModal: React.FC<AdminBusinessRequestsModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BusinessRequest | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-business-requests'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_claim_requests')
        .select(`
          *,
          profiles!business_claim_requests_user_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = data?.map(req => ({
        ...req,
        user_profile: Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
      })) as BusinessRequest[];
      
      return transformedData;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('business_claim_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userData.user.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

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

      if (request.location_id) {
        const { error: locationError } = await supabase
          .from('locations')
          .update({ claimed_by: request.user_id })
          .eq('id', request.location_id);

        if (locationError) throw locationError;
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          type: 'business_approved',
          title: 'Business Account Approved',
          message: `Your business account request for "${request.business_name}" has been approved! You can now switch to your business account.`,
          read: false,
        });

      if (notificationError) console.error('Failed to send notification:', notificationError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-requests'] });
      toast.success('Business request approved successfully');
      setSelectedRequest(null);
      setApproveDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to approve request: ' + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_claim_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: userData.user.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          type: 'business_rejected',
          title: 'Business Account Request Rejected',
          message: `Your business account request for "${request.business_name}" has been rejected. Please contact support for more information.`,
          read: false,
        });

      if (notificationError) console.error('Failed to send notification:', notificationError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-requests'] });
      toast.success('Business request rejected');
      setSelectedRequest(null);
      setRejectDialogOpen(false);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SheetTitle className="text-2xl font-bold">
                {t('adminPanel', { ns: 'settings' })}
              </SheetTitle>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {requests?.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{request.business_name}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Type: {request.business_type}
                        </p>
                        {request.user_profile && (
                          <div className="flex items-center gap-2 mb-2">
                            <img 
                              src={request.user_profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.user_profile.username}`}
                              alt={request.user_profile.username}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm font-medium">@{request.user_profile.username}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{request.contact_email}</span>
                      </div>
                      {request.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{request.contact_phone}</span>
                        </div>
                      )}
                      {request.description && (
                        <div className="flex gap-2 text-sm">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-muted-foreground text-xs">{request.description}</p>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            setApproveDialogOpen(true);
                          }}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectDialogOpen(true);
                          }}
                          disabled={rejectMutation.isPending}
                          variant="destructive"
                          className="flex-1"
                          size="sm"
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
                    <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-muted-foreground text-sm">Pending business account requests will appear here</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Business Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the business account request for{' '}
              <strong>{selectedRequest?.business_name}</strong>?
              <br /><br />
              This will grant the user access to the business dashboard and allow them to manage their location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRequest) {
                  approveMutation.mutate(selectedRequest.id);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Business Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the business account request for{' '}
              <strong>{selectedRequest?.business_name}</strong>?
              <br /><br />
              The user will be notified that their request has been rejected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRequest) {
                  rejectMutation.mutate(selectedRequest.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};

export default AdminBusinessRequestsModal;
