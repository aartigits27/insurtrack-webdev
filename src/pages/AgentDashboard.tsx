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
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Briefcase, DollarSign, Loader2, Heart, Activity, Car, Home, Shield, ChevronDown, ChevronUp, UserPlus, Plus, ArrowLeft, FileText } from 'lucide-react';
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

  // Selected client/policy for detail views
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

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

  // Add policy form
  const [addPolicyDialogOpen, setAddPolicyDialogOpen] = useState(false);
  const [addingPolicy, setAddingPolicy] = useState(false);
  const [policyClientId, setPolicyClientId] = useState('');
  const [policyFormData, setPolicyFormData] = useState({
    policy_name: '',
    policy_provider: '',
    policy_number: '',
    insurance_type: '',
    policy_status: 'active',
    coverage_amount: '',
    premium_amount: '',
    monthly_emi: '',
    emi_date: '',
    start_date: '',
    end_date: '',
    description: '',
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

  const handleAddPolicy = async () => {
    if (!policyClientId) {
      toast.error('Please select a client');
      return;
    }
    if (!policyFormData.policy_name || !policyFormData.policy_provider || !policyFormData.policy_number || !policyFormData.insurance_type || !policyFormData.start_date || !policyFormData.end_date) {
      toast.error('Please fill all required fields');
      return;
    }

    setAddingPolicy(true);

    try {
      const { error } = await supabase.from('insurance_policies').insert([
        {
          user_id: policyClientId,
          agent_id: agentInfo?.id,
          policy_name: policyFormData.policy_name,
          policy_provider: policyFormData.policy_provider,
          policy_number: policyFormData.policy_number,
          insurance_type: policyFormData.insurance_type as 'life' | 'health' | 'vehicle' | 'house',
          policy_status: policyFormData.policy_status as 'active' | 'pending' | 'expired' | 'cancelled',
          coverage_amount: parseFloat(policyFormData.coverage_amount) || 0,
          premium_amount: parseFloat(policyFormData.premium_amount) || 0,
          monthly_emi: policyFormData.monthly_emi ? parseFloat(policyFormData.monthly_emi) : null,
          emi_date: policyFormData.emi_date ? parseInt(policyFormData.emi_date) : null,
          start_date: policyFormData.start_date,
          end_date: policyFormData.end_date,
          description: policyFormData.description || null,
        },
      ]);

      if (error) {
        console.error('Error adding policy:', error);
        toast.error('Failed to add policy');
      } else {
        toast.success('Policy added successfully!');
        setPolicyFormData({
          policy_name: '',
          policy_provider: '',
          policy_number: '',
          insurance_type: '',
          policy_status: 'active',
          coverage_amount: '',
          premium_amount: '',
          monthly_emi: '',
          emi_date: '',
          start_date: '',
          end_date: '',
          description: '',
        });
        setPolicyClientId('');
        setAddPolicyDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Error adding policy:', err);
      toast.error('Failed to add policy');
    }

    setAddingPolicy(false);
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
            <div className="flex gap-2">
              <Dialog open={addPolicyDialogOpen} onOpenChange={setAddPolicyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Policy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Policy</DialogTitle>
                    <DialogDescription>Create a new policy for one of your clients</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Client *</Label>
                      <Select value={policyClientId} onValueChange={setPolicyClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.full_name} ({client.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Policy Name *</Label>
                        <Input
                          placeholder="e.g., Family Health Plan"
                          value={policyFormData.policy_name}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, policy_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Provider *</Label>
                        <Input
                          placeholder="e.g., LIC"
                          value={policyFormData.policy_provider}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, policy_provider: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Policy Number *</Label>
                        <Input
                          placeholder="e.g., POL-2024-001"
                          value={policyFormData.policy_number}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, policy_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance Type *</Label>
                        <Select
                          value={policyFormData.insurance_type}
                          onValueChange={(value) => setPolicyFormData({ ...policyFormData, insurance_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="life">Life Insurance</SelectItem>
                            <SelectItem value="health">Health Insurance</SelectItem>
                            <SelectItem value="vehicle">Vehicle Insurance</SelectItem>
                            <SelectItem value="house">House Insurance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Coverage Amount (₹) *</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 1000000"
                          value={policyFormData.coverage_amount}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, coverage_amount: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Premium (₹) *</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 60000"
                          value={policyFormData.premium_amount}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, premium_amount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monthly EMI (₹)</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 5000"
                          value={policyFormData.monthly_emi}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, monthly_emi: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>EMI Due Date (Day 1-31)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="e.g., 5"
                          value={policyFormData.emi_date}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, emi_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date *</Label>
                        <Input
                          type="date"
                          value={policyFormData.start_date}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Input
                          type="date"
                          value={policyFormData.end_date}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select
                        value={policyFormData.policy_status}
                        onValueChange={(value) => setPolicyFormData({ ...policyFormData, policy_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Additional notes..."
                        value={policyFormData.description}
                        onChange={(e) => setPolicyFormData({ ...policyFormData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAddPolicy} className="w-full" disabled={addingPolicy}>
                      {addingPolicy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Policy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
                                  <div className="flex flex-col items-center gap-3 py-4">
                                    <p className="text-muted-foreground text-sm">No policies found</p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setPolicyClientId(client.id);
                                        setAddPolicyDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add First Policy
                                    </Button>
                                  </div>
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
                                        <TableRow
                                          key={policy.id}
                                          className="cursor-pointer hover:bg-muted/50"
                                          onClick={() => setSelectedPolicy(policy)}
                                        >
                                          <TableCell>{getIconForType(policy.insurance_type)}</TableCell>
                                          <TableCell className="font-medium text-primary underline-offset-2 hover:underline">
                                            {policy.policy_name}
                                          </TableCell>
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

          {/* Policy Detail Dialog */}
          <Dialog open={!!selectedPolicy} onOpenChange={(open) => !open && setSelectedPolicy(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedPolicy && getIconForType(selectedPolicy.insurance_type)}
                  {selectedPolicy?.policy_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedPolicy?.policy_provider} • {selectedPolicy?.policy_number}
                </DialogDescription>
              </DialogHeader>
              {selectedPolicy && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(selectedPolicy.policy_status)}>
                      {selectedPolicy.policy_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Insurance Type</span>
                    <span className="font-medium capitalize">{selectedPolicy.insurance_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coverage Amount</span>
                    <span className="font-medium">{formatCurrency(Number(selectedPolicy.coverage_amount))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Premium Amount</span>
                    <span className="font-medium">{formatCurrency(Number(selectedPolicy.premium_amount))}</span>
                  </div>
                  {selectedPolicy.monthly_emi && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monthly EMI</span>
                      <span className="font-medium">{formatCurrency(Number(selectedPolicy.monthly_emi))}</span>
                    </div>
                  )}
                  {selectedPolicy.emi_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">EMI Due Date</span>
                      <span className="font-medium">{selectedPolicy.emi_date}th of every month</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{new Date(selectedPolicy.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="font-medium">{new Date(selectedPolicy.end_date).toLocaleDateString()}</span>
                  </div>
                  {selectedPolicy.description && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-sm">Description</span>
                      <p className="mt-1 text-sm">{selectedPolicy.description}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;
