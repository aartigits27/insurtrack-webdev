import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, Heart, Activity, Car, Home, CheckCircle2, Lock, FileText } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-subtle)' }}>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-large)' }}>
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              InsurTrack
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Manage all your insurance policies in one secure, easy-to-use platform. Life, health, vehicle, and home insurance - all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Insurance Types */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">All Your Insurance Types Covered</h2>
          <p className="text-muted-foreground text-lg">Comprehensive management for every policy you own</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-lg bg-card border" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Life Insurance</h3>
            <p className="text-muted-foreground">Track term, whole, and universal life insurance policies</p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Health Insurance</h3>
            <p className="text-muted-foreground">Manage medical, dental, and vision coverage</p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Vehicle Insurance</h3>
            <p className="text-muted-foreground">Keep track of auto, motorcycle, and RV insurance</p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">House Insurance</h3>
            <p className="text-muted-foreground">Monitor homeowners and renters insurance policies</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose InsurTrack?</h2>
          <p className="text-muted-foreground text-lg">Powerful features to keep your insurance organized</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Easy Organization</h3>
            <p className="text-muted-foreground">See all your policies at a glance with a clean, intuitive dashboard</p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Secure Storage</h3>
            <p className="text-muted-foreground">Your sensitive policy information is protected with enterprise-grade security</p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Detailed Tracking</h3>
            <p className="text-muted-foreground">Monitor coverage amounts, premiums, and expiration dates effortlessly</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-2xl" style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-large)' }}>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join thousands of users who trust InsurTrack to manage their insurance policies
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/auth')}
            className="text-lg px-8"
          >
            Create Your Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 InsurTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
