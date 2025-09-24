import { 
  LayoutDashboard, 
  TestTube, 
  Brain, 
  Settings, 
  Users, 
  FileText,
  Shield,
  LogOut
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: 'admin' | 'user';
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Test Models", url: "/test-models", icon: TestTube },
  { title: "Models", url: "/models", icon: Brain },
  { title: "Train Model", url: "/train-model", icon: Settings, requiredRole: "admin" },
  { title: "Users", url: "/users", icon: Users, requiredRole: "admin" },
  { title: "Reports", url: "/reports", icon: FileText },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const { logout, user } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const getNavCls = (path: string) =>
    isActive(path) ? "bg-sidebar-accent text-sidebar-primary font-medium" : "hover:bg-sidebar-accent/50";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    // Show all items if no role requirement
    if (!item.requiredRole) return true;
    
    // Show admin-only items only to admin users
    if (item.requiredRole === 'admin') {
      return user?.role === 'admin';
    }
    
    // Show user-only items to all authenticated users
    return true;
  });

  return (
    <Sidebar className={state === "collapsed" ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-sidebar-primary" />
          {state !== "collapsed" && (
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">Zero-Day IDS</h1>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavCls(item.url)}
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-5 w-5" />
                      {state !== "collapsed" && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {state !== "collapsed" ? (
          <Button
            variant="destructive" 
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            className="w-full justify-center p-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}