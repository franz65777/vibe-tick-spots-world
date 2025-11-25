import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  CheckCircle2, 
  Calendar, 
  Mail, 
  AlertCircle,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from 'date-fns';
import { it } from 'date-fns/locale';

interface BusinessAccountManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BusinessAccountManagement: React.FC<BusinessAccountManagementProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const { t } = useTranslation();
  const { businessProfile, loading } = useBusinessProfile();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!businessProfile?.id) return;

      try {
        const { data, error } = await supabase
          .from('business_subscriptions')
          .select('*')
          .eq('user_id', businessProfile.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setSubscriptionData(data);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    if (open) {
      loadSubscriptionData();
    }
  }, [businessProfile, open]);

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@spott.app?subject=Business Account Support';
  };

  const handleManageSubscription = () => {
    toast.info('Gestione abbonamento in arrivo!');
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Sei sicuro di voler annullare il tuo abbonamento? Perderai l\'accesso alle funzionalità business alla fine del periodo di fatturazione corrente.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscriptionData.id);

      if (error) throw error;

      toast.success('Abbonamento annullato. Avrai accesso fino alla fine del periodo corrente.');
      setSubscriptionData({ ...subscriptionData, status: 'cancelled' });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Errore durante l\'annullamento dell\'abbonamento');
    }
  };

  const isInTrialPeriod = subscriptionData && subscriptionData.status === 'trial';
  const trialEndDate = subscriptionData?.next_billing_date 
    ? new Date(subscriptionData.next_billing_date) 
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="p-4 px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <SheetTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Account Business
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
            <div className="py-6 space-y-6">
          {loading || loadingSubscription ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : (
            <>
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Account Verificato
                  </CardTitle>
                  <CardDescription>
                    Il tuo account business è attivo e verificato
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nome Business</span>
                    <span className="font-medium">{businessProfile?.business_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <span className="font-medium">{businessProfile?.business_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stato</span>
                    <Badge variant="default" className="bg-green-500">
                      Verificato
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Piano Business Premium
                  </CardTitle>
                  <CardDescription>
                    {isInTrialPeriod 
                      ? '3 mesi di prova gratuita inclusi' 
                      : '29,99€ al mese'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isInTrialPeriod && trialEndDate && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Periodo di prova attivo</p>
                          <p className="text-xs text-muted-foreground">
                            Il tuo periodo di prova termina il{' '}
                            {formatDate(trialEndDate, 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {subscriptionData && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Piano</span>
                        <span className="font-medium">Business Premium</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Prezzo</span>
                        <span className="font-medium">
                          {isInTrialPeriod ? 'Gratis (Prova)' : '29,99€/mese'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Prossima fatturazione</span>
                        <span className="font-medium">
                          {subscriptionData.next_billing_date 
                            ? formatDate(new Date(subscriptionData.next_billing_date), 'dd MMM yyyy', { locale: it })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stato</span>
                        <Badge variant={subscriptionData.status === 'active' || subscriptionData.status === 'trial' ? 'default' : 'secondary'}>
                          {subscriptionData.status === 'trial' ? 'Prova' : subscriptionData.status === 'active' ? 'Attivo' : 'Annullato'}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Features Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Funzionalità Incluse</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">Analytics avanzate per il tuo business</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">Notifiche push personalizzate ai clienti</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">Gestione contenuti e campagne marketing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">Badge verificato sul profilo business</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">Supporto prioritario via email</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleManageSubscription}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gestisci metodo di pagamento
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleContactSupport}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contatta il supporto
                </Button>

                {subscriptionData?.status !== 'cancelled' && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancelSubscription}
                  >
                    Annulla abbonamento
                  </Button>
                )}
              </div>
            </>
          )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BusinessAccountManagement;
