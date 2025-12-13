import { Shield, LayoutDashboard, User, LogOut, Plus, Users, Briefcase } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { signOut } = useAuth();
  const { role } = useUserRole();
  const isCollapsed = state === 'collapsed';

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50';

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Role-based navigation
  const navItems = role === 'admin'
    ? [
        { title: 'Admin Panel', url: '/admin', icon: Users },
        { title: 'Personal Details', url: '/personal-details', icon: User },
      ]
    : role === 'agent'
    ? [
        { title: 'Agent Panel', url: '/agent', icon: Briefcase },
        { title: 'Personal Details', url: '/personal-details', icon: User },
      ]
    : [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Add Policy', url: '/add-policy', icon: Plus },
        { title: 'Personal Details', url: '/personal-details', icon: User },
      ];

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'}>
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <div className="px-3 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            {!isCollapsed && <span className="font-bold text-lg">InsurTrack</span>}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
