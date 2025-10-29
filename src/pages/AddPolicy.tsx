import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';

const policySchema = z.object({
  policy_name: z.string().min(2, 'Policy name must be at least 2 characters').max(100),
  policy_provider: z.string().min(2, 'Provider name must be at least 2 characters').max(100),
  policy_number: z.string().min(3, 'Policy number must be at least 3 characters').max(50),
  insurance_type: z.enum(['life', 'health', 'vehicle', 'house']),
  policy_status: z.enum(['active', 'pending', 'expired', 'cancelled']),
  coverage_amount: z.number().min(0, 'Coverage amount must be positive'),
  premium_amount: z.number().min(0, 'Premium amount must be positive'),
  monthly_emi: z.number().min(0, 'EMI amount must be positive').optional(),
  emi_date: z.number().min(1, 'EMI date must be between 1-31').max(31, 'EMI date must be between 1-31').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().max(500).optional(),
});

const AddPolicy = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to add a policy');
      navigate('/auth');
      return;
    }

    // Validate form data
    const dataToValidate = {
      ...formData,
      coverage_amount: parseFloat(formData.coverage_amount) || 0,
      premium_amount: parseFloat(formData.premium_amount) || 0,
      monthly_emi: formData.monthly_emi ? parseFloat(formData.monthly_emi) : undefined,
      emi_date: formData.emi_date ? parseInt(formData.emi_date) : undefined,
      insurance_type: formData.insurance_type as 'life' | 'health' | 'vehicle' | 'house',
      policy_status: formData.policy_status as 'active' | 'pending' | 'expired' | 'cancelled',
    };

    const validation = policySchema.safeParse(dataToValidate);
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('insurance_policies').insert([
      {
        user_id: user.id,
        policy_name: formData.policy_name,
        policy_provider: formData.policy_provider,
        policy_number: formData.policy_number,
        insurance_type: formData.insurance_type,
        policy_status: formData.policy_status,
        coverage_amount: parseFloat(formData.coverage_amount),
        premium_amount: parseFloat(formData.premium_amount),
        monthly_emi: formData.monthly_emi ? parseFloat(formData.monthly_emi) : null,
        emi_date: formData.emi_date ? parseInt(formData.emi_date) : null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description || null,
      },
    ]);

    setLoading(false);

    if (error) {
      toast.error('Failed to add policy');
      console.error('Error:', error);
    } else {
      toast.success('Policy added successfully!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      
      <div className="flex-1" style={{ background: 'var(--gradient-subtle)' }}>
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Add New Policy</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card style={{ boxShadow: 'var(--shadow-large)' }}>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
            <CardDescription>Fill in the information about your insurance policy</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy_name">Policy Name *</Label>
                  <Input
                    id="policy_name"
                    placeholder="e.g., Family Health Plan"
                    value={formData.policy_name}
                    onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy_provider">Provider *</Label>
                  <Input
                    id="policy_provider"
                    placeholder="e.g., State Farm"
                    value={formData.policy_provider}
                    onChange={(e) => setFormData({ ...formData, policy_provider: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy_number">Policy Number *</Label>
                  <Input
                    id="policy_number"
                    placeholder="e.g., POL-2024-001"
                    value={formData.policy_number}
                    onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_type">Insurance Type *</Label>
                  <Select
                    value={formData.insurance_type}
                    onValueChange={(value) => setFormData({ ...formData, insurance_type: value })}
                    required
                  >
                    <SelectTrigger id="insurance_type">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coverage_amount">Coverage Amount (₹) *</Label>
                  <Input
                    id="coverage_amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1000000"
                    value={formData.coverage_amount}
                    onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="premium_amount">Total Premium (₹) *</Label>
                  <Input
                    id="premium_amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 60000"
                    value={formData.premium_amount}
                    onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_emi">Monthly EMI (₹)</Label>
                  <Input
                    id="monthly_emi"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 5000"
                    value={formData.monthly_emi}
                    onChange={(e) => setFormData({ ...formData, monthly_emi: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emi_date">EMI Due Date (Day of Month)</Label>
                  <Input
                    id="emi_date"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 5 (5th of every month)"
                    value={formData.emi_date}
                    onChange={(e) => setFormData({ ...formData, emi_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Enter a day between 1-31 for monthly EMI reminder</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy_status">Status *</Label>
                <Select
                  value={formData.policy_status}
                  onValueChange={(value) => setFormData({ ...formData, policy_status: value })}
                  required
                >
                  <SelectTrigger id="policy_status">
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
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional notes about this policy..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Policy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
    </div>
  );
};

export default AddPolicy;
