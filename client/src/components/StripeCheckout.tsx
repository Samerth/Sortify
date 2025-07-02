import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface StripeCheckoutProps {
  planType: string;
  userCount: number;
  totalAmount: number;
  subscriptionId: string;
  organizationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripeCheckout({ 
  planType, 
  userCount, 
  totalAmount, 
  subscriptionId,
  organizationId,
  onSuccess, 
  onCancel 
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        toast({
          title: "Payment Error",
          description: submitError.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/settings?tab=billing&success=true',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
      } else {
        // Confirm subscription on backend
        await apiRequest('POST', '/api/billing/confirm-payment', {
          subscriptionId,
          organizationId
        });

        toast({
          title: "Payment Successful",
          description: `Successfully upgraded to ${planType} plan!`,
        });
        
        onSuccess();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-semibold mb-2">Order Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Plan:</span>
            <span className="font-medium">{planType}</span>
          </div>
          <div className="flex justify-between">
            <span>Users:</span>
            <span className="font-medium">{userCount}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Total:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        
        <div className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!stripe || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
          </Button>
        </div>
      </form>
    </div>
  );
}