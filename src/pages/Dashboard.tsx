import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Heart, Activity, Car, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface Policy {
  id: string;
  policy_name: string;
  policy_provider: string;
  policy_number: string;
  insurance_type: 'life' | 'health' | 'vehicle' | 'house';
  policy_status: 'active' | 'pending' | 'expired' | 'cancelled';
  coverage_amount: number;
  premium_amount: number;
  monthly_emi: number | null;
  emi_date: number | null;
  start_date: string;
  end_date: string;
  description: string | null;
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPolicies();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly EMI</CardTitle>
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
            {/* EMI Reminder Card */}
            {policies.some(p => p.monthly_emi && p.monthly_emi > 0) && (
              <Card className="border-2" style={{ background: 'var(--gradient-vibrant)', boxShadow: 'var(--shadow-large)' }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    EMI Payment Reminder
                  </CardTitle>
                  <CardDescription className="text-white/90">Your upcoming insurance EMI payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {policies.filter(p => p.monthly_emi && p.monthly_emi > 0 && p.policy_status === 'active').map((policy) => (
                    <div key={policy.id} className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{policy.policy_name}</div>
                            <div className="text-sm text-white/80">{policy.policy_provider}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatCurrency(Number(policy.monthly_emi))}</div>
                            <div className="text-sm text-white/80">
                              {policy.emi_date ? `Due on ${policy.emi_date}${getOrdinalSuffix(policy.emi_date)} of every month` : 'Due monthly'}
                            </div>
                          </div>
                        </div>
                    </div>
                  ))}
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
                  {groupedPolicies.life.map((policy) => (
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
                          <span className="text-muted-foreground">Monthly EMI:</span>
                          <span className="font-medium">{formatCurrency(Number(policy.monthly_emi || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valid Until:</span>
                          <span className="font-medium">{new Date(policy.end_date).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                  {groupedPolicies.health.map((policy) => (
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
                          <span className="text-muted-foreground">Monthly EMI:</span>
                          <span className="font-medium">{formatCurrency(Number(policy.monthly_emi || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valid Until:</span>
                          <span className="font-medium">{new Date(policy.end_date).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                  {groupedPolicies.vehicle.map((policy) => (
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
                          <span className="text-muted-foreground">Monthly EMI:</span>
                          <span className="font-medium">{formatCurrency(Number(policy.monthly_emi || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valid Until:</span>
                          <span className="font-medium">{new Date(policy.end_date).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                  {groupedPolicies.house.map((policy) => (
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
                          <span className="text-muted-foreground">Monthly EMI:</span>
                          <span className="font-medium">{formatCurrency(Number(policy.monthly_emi || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valid Until:</span>
                          <span className="font-medium">{new Date(policy.end_date).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </div>
  );
};

export default Dashboard;
