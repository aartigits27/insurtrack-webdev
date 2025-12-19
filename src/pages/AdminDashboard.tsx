import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Shield, Plus, Users, UserPlus, Loader2, Trash2, Link, ChevronDown, ChevronRight, FileText, Calendar, IndianRupee, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PremiumPaymentStatus } from '@/components/PremiumPaymentStatus';

interface Agent {
  id: string;
  user_id: string;
  agent_code: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

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

interface Client {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  policies?: Policy[];
}

interface AgentClient {
  id: string;
  agent_id: string;
  client_id: string;
  assigned_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin } = useUserRole();
  const navigate = useNavigate();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agentClients, setAgentClients] = useState<AgentClient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Agent Form
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentCode, setNewAgentCode] = useState('');
  const [newAgentCommission, setNewAgentCommission] = useState('10');
  const [addingAgent, setAddingAgent] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  
  // Assign Client Form
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedClientForAssign, setSelectedClientForAssign] = useState('');
  const [assigningClient, setAssigningClient] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Client & Policy View
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast.error('Access denied. Admin only.');
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAgents(), fetchClients(), fetchAgentClients()]);
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return;
    }

    // Fetch profiles for agents
    const agentsWithProfiles = await Promise.all(
      (data || []).map(async (agent) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', agent.user_id)
          .maybeSingle();
        return { ...agent, profile };
      })
    );

    setAgents(agentsWithProfiles);
  };

  const fetchClients = async () => {
    // Fetch all users with 'user' role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'user');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return;
    }

    const userIds = userRoles?.map(r => r.user_id) || [];
    
    if (userIds.length === 0) {
      setClients([]);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    setClients(profiles || []);
  };

  const fetchAgentClients = async () => {
    const { data, error } = await supabase
      .from('agent_clients')
      .select('*')
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent clients:', error);
      return;
    }

    // Fetch client profiles
    const clientsWithProfiles = await Promise.all(
      (data || []).map(async (ac) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', ac.client_id)
          .maybeSingle();
        return { ...ac, profile };
      })
    );

    setAgentClients(clientsWithProfiles);
  };

  const handleAddAgent = async () => {
    if (!newAgentEmail || !newAgentPassword || !newAgentName || !newAgentCode) {
      toast.error('Please fill all required fields');
      return;
    }

    setAddingAgent(true);

    try {
      const { error } = await supabase.functions.invoke('create-agent', {
        body: {
          email: newAgentEmail,
          password: newAgentPassword,
          fullName: newAgentName,
          agentCode: newAgentCode,
          commissionRate: parseFloat(newAgentCommission) || 10,
        },
      });

      if (error) {
        console.error('Error creating agent via function:', error);
        toast.error(error.message || 'Failed to add agent');
      } else {
        toast.success('Agent added successfully!');
        setNewAgentEmail('');
        setNewAgentPassword('');
        setNewAgentName('');
        setNewAgentCode('');
        setNewAgentCommission('10');
        setAgentDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Error adding agent:', err);
      toast.error('Failed to add agent');
    }

    setAddingAgent(false);
  };

  const handleAssignClient = async () => {
    if (!selectedAgent || !selectedClientForAssign) {
      toast.error('Please select both agent and client');
      return;
    }

    setAssigningClient(true);

    const { error } = await supabase
      .from('agent_clients')
      .insert({
        agent_id: selectedAgent,
        client_id: selectedClientForAssign,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This client is already assigned to this agent');
      } else {
        toast.error('Failed to assign client');
        console.error('Error assigning client:', error);
      }
    } else {
      toast.success('Client assigned successfully!');
      setSelectedAgent('');
      setSelectedClientForAssign('');
      setAssignDialogOpen(false);
      fetchAgentClients();
    }

    setAssigningClient(false);
  };

  const handleRemoveAssignment = async (id: string) => {
    const { error } = await supabase
      .from('agent_clients')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to remove assignment');
    } else {
      toast.success('Assignment removed');
      fetchAgentClients();
    }
  };

  const handleToggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('agents')
      .update({ is_active: !currentStatus })
      .eq('id', agentId);

    if (error) {
      toast.error('Failed to update agent status');
    } else {
      toast.success(`Agent ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchAgents();
    }
  };

  const toggleClientExpansion = async (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      // Fetch policies for this client if not already loaded
      const client = clients.find(c => c.id === clientId);
      if (client && !client.policies) {
        const { data: policies, error } = await supabase
          .from('insurance_policies')
          .select('*')
          .eq('user_id', clientId)
          .order('created_at', { ascending: false });
        
        if (!error && policies) {
          setClients(prev => prev.map(c => 
            c.id === clientId ? { ...c, policies: policies as Policy[] } : c
          ));
        }
      }
    }
    setExpandedClients(newExpanded);
  };

  const handleViewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setPolicyDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'expired': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'inactive': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'matured': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default: return '';
    }
  };

  const getInsuranceTypeIcon = (type: string) => {
    return <FileText className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading || roleLoading || !isAdmin) {
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
                  <Shield className="w-5 h-5 text-primary" />
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">Manage agents and client assignments</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{agents.length}</div>
              </CardContent>
            </Card>
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{clients.length}</div>
              </CardContent>
            </Card>
            <Card style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-soft)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{agentClients.length}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="agents" className="space-y-6">
            <TabsList>
              <TabsTrigger value="agents" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Clients & Policies
              </TabsTrigger>
              <TabsTrigger value="assignments" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Client Assignments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Insurance Agents</CardTitle>
                    <CardDescription>Manage your insurance agents</CardDescription>
                  </div>
                  <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Agent
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Agent</DialogTitle>
                        <DialogDescription>Create a new insurance agent account</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Full Name *</Label>
                          <Input
                            placeholder="John Doe"
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            placeholder="agent@example.com"
                            value={newAgentEmail}
                            onChange={(e) => setNewAgentEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password *</Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={newAgentPassword}
                            onChange={(e) => setNewAgentPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Agent Code *</Label>
                          <Input
                            placeholder="AGT001"
                            value={newAgentCode}
                            onChange={(e) => setNewAgentCode(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Commission Rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="10"
                            value={newAgentCommission}
                            onChange={(e) => setNewAgentCommission(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleAddAgent} className="w-full" disabled={addingAgent}>
                          {addingAgent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Add Agent
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No agents yet. Add your first agent.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Agent Code</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell className="font-medium">{agent.profile?.full_name || 'N/A'}</TableCell>
                            <TableCell>{agent.profile?.email || 'N/A'}</TableCell>
                            <TableCell>{agent.agent_code}</TableCell>
                            <TableCell>{agent.commission_rate}%</TableCell>
                            <TableCell>
                              <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                                {agent.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAgentStatus(agent.id, agent.is_active)}
                              >
                                {agent.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>All Clients & Their Policies</CardTitle>
                  <CardDescription>View client details and their insurance policies</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No clients yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clients.map((client) => (
                        <Collapsible
                          key={client.id}
                          open={expandedClients.has(client.id)}
                          onOpenChange={() => toggleClientExpansion(client.id)}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {expandedClients.has(client.id) ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div className="text-left">
                                <p className="font-medium">{client.full_name || 'No Name'}</p>
                                <p className="text-sm text-muted-foreground">{client.email}</p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {client.policies?.length || 0} policies
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2 pl-8">
                            {client.policies && client.policies.length > 0 ? (
                              <div className="space-y-2">
                                {client.policies.map((policy) => (
                                  <div
                                    key={policy.id}
                                    className="flex items-center justify-between p-3 bg-background border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                                    onClick={() => handleViewPolicy(policy)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {getInsuranceTypeIcon(policy.insurance_type)}
                                      <div>
                                        <p className="font-medium text-sm">{policy.policy_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {policy.policy_provider} • {policy.policy_number}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={getStatusColor(policy.policy_status)}>
                                        {policy.policy_status}
                                      </Badge>
                                      <span className="text-sm font-medium">
                                        {formatCurrency(Number(policy.coverage_amount || 0))}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                No policies found for this client.
                              </p>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assignments">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Client Assignments</CardTitle>
                    <CardDescription>Assign clients to agents</CardDescription>
                  </div>
                  <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Assign Client
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Client to Agent</DialogTitle>
                        <DialogDescription>Select an agent and client to create an assignment</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Select Agent</Label>
                          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.filter(a => a.is_active).map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.profile?.full_name || agent.agent_code} ({agent.agent_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Select Client</Label>
                          <Select value={selectedClientForAssign} onValueChange={setSelectedClientForAssign}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.full_name || client.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAssignClient} className="w-full" disabled={assigningClient}>
                          {assigningClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Assign Client
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : agentClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No assignments yet. Assign your first client.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Client Email</TableHead>
                          <TableHead>Assigned On</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentClients.map((ac) => {
                          const agent = agents.find(a => a.id === ac.agent_id);
                          return (
                            <TableRow key={ac.id}>
                              <TableCell className="font-medium">
                                {agent?.profile?.full_name || agent?.agent_code || 'N/A'}
                              </TableCell>
                              <TableCell>{ac.profile?.full_name || 'N/A'}</TableCell>
                              <TableCell>{ac.profile?.email || 'N/A'}</TableCell>
                              <TableCell>{new Date(ac.assigned_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveAssignment(ac.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Policy Detail Dialog */}
          <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Policy Details
                </DialogTitle>
                <DialogDescription>
                  View complete policy information
                </DialogDescription>
              </DialogHeader>
              {selectedPolicy && (
                <div className="space-y-6 py-4">
                  {/* Policy Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedPolicy.policy_name}</h3>
                      <p className="text-muted-foreground">{selectedPolicy.policy_provider}</p>
                      <p className="text-sm text-muted-foreground">Policy #: {selectedPolicy.policy_number}</p>
                    </div>
                    <Badge className={getStatusColor(selectedPolicy.policy_status)}>
                      {selectedPolicy.policy_status}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Policy Type */}
                  <div className="flex items-center gap-2">
                    {getInsuranceTypeIcon(selectedPolicy.insurance_type)}
                    <span className="font-medium capitalize">{selectedPolicy.insurance_type} Insurance</span>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Coverage Amount</p>
                      <p className="text-lg font-semibold flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {formatCurrency(Number(selectedPolicy.coverage_amount || 0))}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Premium Amount</p>
                      <p className="text-lg font-semibold flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {formatCurrency(Number(selectedPolicy.premium_amount || 0))}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Premium & Due Date */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPolicy.monthly_emi && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Monthly Premium Amount</p>
                        <p className="font-medium">{formatCurrency(Number(selectedPolicy.monthly_emi))}</p>
                      </div>
                    )}
                    {selectedPolicy.emi_date && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Premium Due Date</p>
                        <p className="font-medium">{selectedPolicy.emi_date}th of every month</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Start Date
                      </p>
                      <p className="font-medium">
                        {new Date(selectedPolicy.start_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        End Date
                      </p>
                      <p className="font-medium">
                        {new Date(selectedPolicy.end_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Premium Payment Status */}
                  <Separator />
                  <PremiumPaymentStatus policyId={selectedPolicy.id} showHistory={true} />

                  {/* Description */}
                  {selectedPolicy.description && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-sm">{selectedPolicy.description}</p>
                      </div>
                    </>
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

export default AdminDashboard;
