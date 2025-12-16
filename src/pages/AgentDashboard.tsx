import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Briefcase, DollarSign, Loader2, Heart, Activity, Car, Home, Shield, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  user_id: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
  policies: Policy[];
}

interface Commission {
  id: string;
  policy_id: string;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  policy?: Policy;
}

interface AgentInfo {
  id: string;
  agent_code: string;
  commission_rate: number;
  is_active: boolean;
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const AgentDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAgent } = useUserRole();
  const navigate = useNavigate();
  
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Onboard client form
  const [onboardDialogOpen, setOnboardDialogOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [newClientData, setNewClientData] = useState({
    fullName: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAgent) {
        toast.error('Access denied. Agent only.');
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, roleLoading, isAgent, navigate]);

  useEffect(() => {
    if (isAgent && user) {
      fetchData();
    }
  }, [isAgent, user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAgentInfo(), fetchClients(), fetchCommissions()]);
    setLoading(false);
  };

  const fetchAgentInfo = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent info:', error);
    } else {
      setAgentInfo(data);
    }
  };

  const fetchClients = async () => {
    if (!user) return;

    // First get agent id
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!agentData) return;

    // Get assigned clients
    const { data: assignments, error: assignError } = await supabase
      .from('agent_clients')
      .select('client_id')
      .eq('agent_id', agentData.id);

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
      return;
    }

    const clientIds = assignments?.map(a => a.client_id) || [];

    if (clientIds.length === 0) {
      setClients([]);
      return;
    }

    // Get client profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', clientIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }

    // Get policies for each client
    const clientsWithPolicies: Client[] = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: policies } = await supabase
          .from('insurance_policies')
          .select('*')
          .eq('user_id', profile.id);

        return {
          id: profile.id,
          full_name: profile.full_name || 'N/A',
          email: profile.email,
          policies: policies || [],
        };
      })
    );

    setClients(clientsWithPolicies);
  };

  const fetchCommissions = async () => {
    if (!user) return;

    // Get agent id
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!agentData) return;

    const { data, error } = await supabase
      .from('policy_commissions')
      .select('*')
      .eq('agent_id', agentData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching commissions:', error);
      return;
    }

    // Get policy details for each commission
    const commissionsWithPolicies = await Promise.all(
      (data || []).map(async (commission) => {
        const { data: policy } = await supabase
          .from('insurance_policies')
          .select('*')
          .eq('id', commission.policy_id)
          .maybeSingle();

        return { ...commission, policy };
      })
    );

    setCommissions(commissionsWithPolicies);
  };

  const handleOnboardClient = async () => {
    if (!newClientData.fullName || !newClientData.email || !newClientData.password) {
      toast.error('Please fill all required fields');
      return;
    }

    if (newClientData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setOnboarding(true);

    try {
      const { data, error } = await supabase.functions.invoke('onboard-client', {
        body: {
          email: newClientData.email,
          password: newClientData.password,
          fullName: newClientData.fullName,
          age: newClientData.age ? parseInt(newClientData.age) : undefined,
          gender: newClientData.gender || undefined,
          dateOfBirth: newClientData.dateOfBirth || undefined,
        },
      });

      if (error) {
        console.error('Error onboarding client:', error);
        toast.error(error.message || 'Failed to onboard client');
      } else {
        toast.success(`Client onboarded successfully! They can login with agent code: ${agentInfo?.agent_code}`);
        setNewClientData({
          fullName: '',
          email: '',
          password: '',
          age: '',
          gender: '',
          dateOfBirth: '',
        });
        setOnboardDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Error onboarding client:', err);
      toast.error('Failed to onboard client');
    }

    setOnboarding(false);
  };

  const toggleClientExpand = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'life': return <Heart className="w-4 h-4" />;
      case 'health': return <Activity className="w-4 h-4" />;
      case 'vehicle': return <Car className="w-4 h-4" />;
      case 'house': return <Home className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'expired': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return '';
    }
  };

  const activeClients = clients.filter(c => 
    c.policies.some(p => p.policy_status === 'active')
  );

  const expiredClients = clients.filter(c => 
    c.policies.length > 0 && c.policies.every(p => p.policy_status === 'expired' || p.policy_status === 'cancelled')
  );

  const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const pendingCommission = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  if (authLoading || roleLoading || !isAgent) {
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
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Agent Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Agent Code: {agentInfo?.agent_code || 'N/A'} | Commission Rate: {agentInfo?.commission_rate || 0}%
                </p>
              </div>
            </div>
            <Dialog open={onboardDialogOpen} onOpenChange={setOnboardDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Onboard Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Onboard New Client</DialogTitle>
                  <DialogDescription>
                    Create a new client account. They will use agent code: <strong>{agentInfo?.agent_code}</strong> to login.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={newClientData.fullName}
                      onChange={(e) => setNewClientData({ ...newClientData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Password *</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newClientData.password}
                      onChange={(e) => setNewClientData({ ...newClientData, password: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Client can change this password later</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        min="0"
                        max="150"
                        placeholder="25"
                        value={newClientData.age}
                        onChange={(e) => setNewClientData({ ...newClientData, age: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={newClientData.dateOfBirth}
                        onChange={(e) => setNewClientData({ ...newClientData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newClientData.gender}
                      onChange={(e) => setNewClientData({ ...newClientData, gender: e.target.value })}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <Button onClick={handleOnboardClient} className="w-full" disabled={onboarding}>
                    {onboarding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Client Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{clients.length}</div>
              </CardContent>
            </Card>
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{activeClients.length}</div>
              </CardContent>
            </Card>
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expired Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-muted-foreground">{expiredClients.length}</div>
              </CardContent>
            </Card>
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(totalCommission)}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="clients" className="space-y-6">
            <TabsList>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Clients
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Active Clients
              </TabsTrigger>
              <TabsTrigger value="expired" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Expired Clients
              </TabsTrigger>
              <TabsTrigger value="commissions" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Commissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>All Clients</CardTitle>
                  <CardDescription>View all your assigned clients and their policies</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No clients assigned to you yet. Use "Onboard Client" to add your first client.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clients.map((client) => (
                        <Collapsible
                          key={client.id}
                          open={expandedClients.has(client.id)}
                          onOpenChange={() => toggleClientExpand(client.id)}
                        >
                          <Card>
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-base">{client.full_name}</CardTitle>
                                    <CardDescription>{client.email}</CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{client.policies.length} policies</Badge>
                                    {expandedClients.has(client.id) ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent>
                                {client.policies.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">No policies found</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Policy Name</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Coverage</TableHead>
                                        <TableHead>Premium</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Valid Until</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {client.policies.map((policy) => (
                                        <TableRow key={policy.id}>
                                          <TableCell>{getIconForType(policy.insurance_type)}</TableCell>
                                          <TableCell className="font-medium">{policy.policy_name}</TableCell>
                                          <TableCell>{policy.policy_provider}</TableCell>
                                          <TableCell>{formatCurrency(Number(policy.coverage_amount))}</TableCell>
                                          <TableCell>{formatCurrency(Number(policy.premium_amount))}</TableCell>
                                          <TableCell>
                                            <Badge className={getStatusColor(policy.policy_status)}>
                                              {policy.policy_status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{new Date(policy.end_date).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle>Active Clients</CardTitle>
                  <CardDescription>Clients with at least one active policy</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : activeClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No active clients.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Active Policies</TableHead>
                          <TableHead>Total Coverage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeClients.map((client) => {
                          const activePolicies = client.policies.filter(p => p.policy_status === 'active');
                          const totalCoverage = activePolicies.reduce((sum, p) => sum + Number(p.coverage_amount), 0);
                          return (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">{client.full_name}</TableCell>
                              <TableCell>{client.email}</TableCell>
                              <TableCell>{activePolicies.length}</TableCell>
                              <TableCell>{formatCurrency(totalCoverage)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expired">
              <Card>
                <CardHeader>
                  <CardTitle>Expired/Inactive Clients</CardTitle>
                  <CardDescription>Clients with only expired or cancelled policies</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : expiredClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No expired clients.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Total Policies</TableHead>
                          <TableHead>Last Policy End Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiredClients.map((client) => {
                          const lastEndDate = client.policies
                            .map(p => new Date(p.end_date))
                            .sort((a, b) => b.getTime() - a.getTime())[0];
                          return (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">{client.full_name}</TableCell>
                              <TableCell>{client.email}</TableCell>
                              <TableCell>{client.policies.length}</TableCell>
                              <TableCell>{lastEndDate?.toLocaleDateString() || 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions">
              <Card>
                <CardHeader>
                  <CardTitle>Commission Details</CardTitle>
                  <CardDescription>View all your commission earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : commissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No commissions yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Policy Name</TableHead>
                          <TableHead>Policy Number</TableHead>
                          <TableHead>Commission Rate</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell className="font-medium">
                              {commission.policy?.policy_name || 'N/A'}
                            </TableCell>
                            <TableCell>{commission.policy?.policy_number || 'N/A'}</TableCell>
                            <TableCell>{commission.commission_rate}%</TableCell>
                            <TableCell>{formatCurrency(Number(commission.commission_amount))}</TableCell>
                            <TableCell>
                              <Badge className={
                                commission.status === 'paid' 
                                  ? 'bg-green-500/10 text-green-700' 
                                  : commission.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-700'
                                  : 'bg-red-500/10 text-red-700'
                              }>
                                {commission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(commission.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;
