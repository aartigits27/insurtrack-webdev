import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface PremiumPayment {
  id: string;
  payment_month: number;
  payment_year: number;
  amount: number;
  payment_date: string;
}

interface PremiumPaymentStatusProps {
  policyId: string;
  showHistory?: boolean;
}

export const PremiumPaymentStatus = ({ policyId, showHistory = false }: PremiumPaymentStatusProps) => {
  const [payments, setPayments] = useState<PremiumPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchPayments();
  }, [policyId]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('premium_payments')
      .select('*')
      .eq('policy_id', policyId)
      .order('payment_year', { ascending: false })
      .order('payment_month', { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  const isCurrentMonthPaid = payments.some(
    p => p.payment_month === currentMonth && p.payment_year === currentYear
  );

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'short' });
  };

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Current Month Premium:</span>
        {isCurrentMonthPaid ? (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Paid
          </Badge>
        ) : (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Not Paid
          </Badge>
        )}
      </div>
      
      {showHistory && payments.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground mb-2">Recent Payments:</p>
          <div className="flex flex-wrap gap-1">
            {payments.slice(0, 6).map((payment) => (
              <Badge key={payment.id} variant="outline" className="text-xs">
                {getMonthName(payment.payment_month)} {payment.payment_year}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPaymentStatus;
