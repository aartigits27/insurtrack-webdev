import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Loader2, UserCog, User } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const clientSignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  agentCode: z.string().min(1, 'Agent code is required'),
});

const Auth = () => {
  const { signIn, user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Admin/Agent sign in
  const [adminSignInData, setAdminSignInData] = useState({
    email: '',
    password: '',
  });

  // Client sign in with agent code
  const [clientSignInData, setClientSignInData] = useState({
    email: '',
    password: '',
    agentCode: '',
  });

  // Redirect based on role after authentication
  useEffect(() => {
    if (user && !roleLoading && role) {
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'agent') {
        navigate('/agent');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, roleLoading, navigate]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signInSchema.safeParse(adminSignInData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    const { error } = await signIn(adminSignInData.email, adminSignInData.password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
      setLoading(false);
      return;
    }

    // Check if user is admin or agent
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    if (loggedInUser) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();

      if (roleData?.role !== 'admin' && roleData?.role !== 'agent') {
        await supabase.auth.signOut();
        toast.error('This login is for Admin/Agent only. Clients should use the Client Login tab.');
        setLoading(false);
        return;
      }
    }

    toast.success('Welcome back!');
    setLoading(false);
  };

  const handleClientSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = clientSignInSchema.safeParse(clientSignInData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    const { error } = await signIn(clientSignInData.email, clientSignInData.password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
      setLoading(false);
      return;
    }

    // Verify the agent code matches
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    if (loggedInUser) {
      // Check if user role is 'user'
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();

      if (roleData?.role !== 'user') {
        await supabase.auth.signOut();
        toast.error('This login is for clients only. Admin/Agent should use the Admin/Agent Login tab.');
        setLoading(false);
        return;
      }

      // Verify agent code by checking agent_clients relationship
      const { data: agentClientData } = await supabase
        .from('agent_clients')
        .select('agent_id')
        .eq('client_id', loggedInUser.id)
        .maybeSingle();

      if (agentClientData) {
        // Verify the agent code matches
        const { data: agentData } = await supabase
          .from('agents')
          .select('agent_code')
          .eq('id', agentClientData.agent_id)
          .maybeSingle();

        if (!agentData || agentData.agent_code !== clientSignInData.agentCode) {
          await supabase.auth.signOut();
          toast.error('Invalid agent code. Please contact your agent for the correct code.');
          setLoading(false);
          return;
        }
      } else {
        await supabase.auth.signOut();
        toast.error('No agent assigned to this account. Please contact your agent.');
        setLoading(false);
        return;
      }
    }

    toast.success('Welcome back!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8" style={{ background: 'var(--gradient-subtle)' }}>
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/80" style={{ boxShadow: 'var(--shadow-large)' }}>
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">InsurTrack</CardTitle>
            <CardDescription className="text-base mt-2">Manage all your insurance policies in one place</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Client Login
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Admin/Agent
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="client">
              <form onSubmit={handleClientSignIn} className="space-y-4">
                <div className="text-sm text-muted-foreground text-center mb-4">
                  Login with credentials provided by your insurance agent
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="you@example.com"
                    value={clientSignInData.email}
                    onChange={(e) => setClientSignInData({ ...clientSignInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password</Label>
                  <Input
                    id="client-password"
                    type="password"
                    placeholder="••••••••"
                    value={clientSignInData.password}
                    onChange={(e) => setClientSignInData({ ...clientSignInData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-code">Agent Code</Label>
                  <Input
                    id="agent-code"
                    type="text"
                    placeholder="AGT001"
                    value={clientSignInData.agentCode}
                    onChange={(e) => setClientSignInData({ ...clientSignInData, agentCode: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Enter the code provided by your insurance agent</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="admin">
              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div className="text-sm text-muted-foreground text-center mb-4">
                  Admin and Agent login only
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={adminSignInData.email}
                    onChange={(e) => setAdminSignInData({ ...adminSignInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={adminSignInData.password}
                    onChange={(e) => setAdminSignInData({ ...adminSignInData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
