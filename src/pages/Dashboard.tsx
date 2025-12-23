import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Plus, Heart, Activity, Car, Home, Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface Policy {
  id: string;
  policy_name: string;
  policy_provider: string;
  policy_number: string;
  insurance_type: 'life' | 'health' | 'vehicle' | 'house';
  policy_status: 'active' | 'pending' | 'expired' | 'cancelled' | 'inactive' | 'matured';
  coverage_amount: number;
  premium_amount: number;
  monthly_emi: number | null;
  emi_date: number | null;
  start_date: string;
  end_date: string;
  description: string | null;
}

interface PremiumPayment {
  id: string;
  policy_id: string;
  payment_month: number;
  payment_year: number;
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [premiumPayments, setPremiumPayments] = useState<PremiumPayment[]>([]);
  
  // Pay Premium Dialog
  const [payPremiumOpen, setPayPremiumOpen] = useState(false);
  const [selectedPolicyForPayment, setSelectedPolicyForPayment] = useState<Policy | null>(null);
  const [paymentMonth, setPaymentMonth] = useState<string>('');
  const [paymentYear, setPaymentYear] = useState<string>(new Date().getFullYear().toString());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [payingPremium, setPayingPremium] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPolicies();
      fetchPremiumPayments();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  const fetchPolicies = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load policies');
      console.error('Error:', error);
    } else {
      setPolicies(data || []);
    }
    setLoading(false);
  };

  const fetchPremiumPayments = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('premium_payments')
      .select('id, policy_id, payment_month, payment_year')
      .eq('user_id', user.id);

    if (!error && data) {
      setPremiumPayments(data);
    }
  };

  const isPremiumPaidForMonth = (policyId: string, month: number, year: number) => {
    return premiumPayments.some(
      p => p.policy_id === policyId && p.payment_month === month && p.payment_year === year
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const openPayPremiumDialog = (policy: Policy) => {
    setSelectedPolicyForPayment(policy);
    setPaymentMonth(currentMonth.toString());
    setPaymentYear(currentYear.toString());
    setPaymentMethod('');
    setTransactionId('');
    setPayPremiumOpen(true);
  };

  const handlePayPremium = async () => {
    if (!selectedPolicyForPayment || !user || !paymentMonth || !paymentYear) {
      toast.error('Please fill all required fields');
      return;
    }

    const month = parseInt(paymentMonth);
    const year = parseInt(paymentYear);

    // Check if already paid
    if (isPremiumPaidForMonth(selectedPolicyForPayment.id, month, year)) {
      toast.error('Premium for this month is already paid');
      return;
    }

    setPayingPremium(true);

    const { error } = await supabase
      .from('premium_payments')
      .insert({
        policy_id: selectedPolicyForPayment.id,
        user_id: user.id,
        amount: selectedPolicyForPayment.monthly_emi || selectedPolicyForPayment.premium_amount,
        payment_month: month,
        payment_year: year,
        payment_method: paymentMethod || null,
        transaction_id: transactionId || null,
      });

    if (error) {
      console.error('Error paying premium:', error);
      toast.error('Failed to record payment');
    } else {
      toast.success('Premium payment recorded successfully!');
      setPayPremiumOpen(false);
      fetchPremiumPayments();
    }

    setPayingPremium(false);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'life':
        return <Heart className="w-5 h-5" />;
      case 'health':
        return <Activity className="w-5 h-5" />;
      case 'vehicle':
        return <Car className="w-5 h-5" />;
      case 'house':
        return <Home className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'expired':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'inactive':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'matured':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      default:
        return '';
    }
  };

  const groupedPolicies = {
    life: policies.filter(p => p.insurance_type === 'life'),
    health: policies.filter(p => p.insurance_type === 'health'),
    vehicle: policies.filter(p => p.insurance_type === 'vehicle'),
    house: policies.filter(p => p.insurance_type === 'house'),
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const renderPolicyCard = (policy: Policy) => {
    const isCurrentMonthPaid = isPremiumPaidForMonth(policy.id, currentMonth, currentYear);
    
    return (
      <Card key={policy.id} className="hover:shadow-lg transition-shadow" style={{ boxShadow: 'var(--shadow-soft)' }}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getIconForType(policy.insurance_type)}
              <div>
                <CardTitle className="text-base">{policy.policy_name}</CardTitle>
                <CardDescription>{policy.policy_provider}</CardDescription>
              </div>
            </div>
            <Badge className={getStatusColor(policy.policy_status)}>
              {policy.policy_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Policy #:</span>
            <span className="font-medium">{policy.policy_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coverage:</span>
            <span className="font-medium">{formatCurrency(Number(policy.coverage_amount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Premium:</span>
            <span className="font-medium">{formatCurrency(Number(policy.monthly_emi || 0))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valid Until:</span>
            <span className="font-medium">{new Date(policy.end_date).toLocaleDateString()}</span>
          </div>
          
          {/* Premium Status */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-muted-foreground">This Month:</span>
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
          
          {/* Pay Premium Button */}
          {policy.policy_status === 'active' && policy.monthly_emi && (
            <Button 
              size="sm" 
              className="w-full mt-2"
              onClick={() => openPayPremiumDialog(policy)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Premium
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      
      <div className="flex-1" style={{ background: 'var(--gradient-subtle)' }}>
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/add-policy')} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Policy
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{policies.length}</div>
            </CardContent>
          </Card>
          <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {policies.filter(p => p.policy_status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(policies.reduce((sum, p) => sum + Number(p.coverage_amount || 0), 0))}
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(policies.reduce((sum, p) => sum + Number(p.monthly_emi || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : policies.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <Shield className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No policies yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first insurance policy</p>
                <Button onClick={() => navigate('/add-policy')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Policy
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Premium Reminder Card */}
            {policies.some(p => p.monthly_emi && p.monthly_emi > 0 && p.policy_status === 'active') && (
              <Card className="border-2" style={{ background: 'var(--gradient-vibrant)', boxShadow: 'var(--shadow-large)' }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Premium Payment Reminder
                  </CardTitle>
                  <CardDescription className="text-white/90">Your upcoming insurance premium payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {policies.filter(p => p.monthly_emi && p.monthly_emi > 0 && p.policy_status === 'active').map((policy) => {
                    const isPaid = isPremiumPaidForMonth(policy.id, currentMonth, currentYear);
                    return (
                      <div key={policy.id} className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold">{policy.policy_name}</div>
                            <div className="text-sm text-white/80">{policy.policy_provider}</div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="font-bold text-lg">{formatCurrency(Number(policy.monthly_emi))}</div>
                              <div className="text-sm text-white/80">
                                {policy.emi_date ? `Due on ${policy.emi_date}${getOrdinalSuffix(policy.emi_date)}` : 'Due monthly'}
                              </div>
                            </div>
                            {isPaid ? (
                              <Badge className="bg-white/30 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => openPayPremiumDialog(policy)}
                              >
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            
            {/* Life Insurance */}
            {groupedPolicies.life.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Life Insurance</h2>
                  <Badge variant="secondary">{groupedPolicies.life.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPolicies.life.map(renderPolicyCard)}
                </div>
              </div>
            )}

            {/* Health Insurance */}
            {groupedPolicies.health.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Health Insurance</h2>
                  <Badge variant="secondary">{groupedPolicies.health.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPolicies.health.map(renderPolicyCard)}
                </div>
              </div>
            )}

            {/* Vehicle Insurance */}
            {groupedPolicies.vehicle.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Car className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Vehicle Insurance</h2>
                  <Badge variant="secondary">{groupedPolicies.vehicle.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPolicies.vehicle.map(renderPolicyCard)}
                </div>
              </div>
            )}

            {/* House Insurance */}
            {groupedPolicies.house.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Home className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">House Insurance</h2>
                  <Badge variant="secondary">{groupedPolicies.house.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPolicies.house.map(renderPolicyCard)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pay Premium Dialog */}
        <Dialog open={payPremiumOpen} onOpenChange={setPayPremiumOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pay Premium
              </DialogTitle>
              <DialogDescription>
                Record premium payment for {selectedPolicyForPayment?.policy_name}
              </DialogDescription>
            </DialogHeader>
            {selectedPolicyForPayment && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Policy:</span>
                    <span className="font-medium">{selectedPolicyForPayment.policy_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(Number(selectedPolicyForPayment.monthly_emi || selectedPolicyForPayment.premium_amount))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Month *</Label>
                    <Select value={paymentMonth} onValueChange={setPaymentMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Year *</Label>
                    <Select value={paymentYear} onValueChange={setPaymentYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method (Optional)</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="netbanking">Net Banking</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transaction ID (Optional)</Label>
                  <Input
                    placeholder="Enter transaction reference"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handlePayPremium}
                  disabled={payingPremium}
                >
                  {payingPremium ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
    </div>
  );
};

export default Dashboard;
