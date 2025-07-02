import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "./OrganizationProvider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  BarChart3, 
  Inbox, 
  Package, 
  Users, 
  History, 
  Settings, 
  Plug,
  LogOut,
  Building 
} from "lucide-react";

const navigationItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/mail-intake", label: "Mail Intake", icon: Inbox },
  { path: "/pending-pickups", label: "Pending Pickups", icon: Package },
  { path: "/recipients", label: "Recipients", icon: Users },
  { path: "/history", label: "History", icon: History },
];

const adminItems = [
  { path: "/integrations", label: "Integrations", icon: Plug },
  { path: "/settings/customization", label: "Customization", icon: Settings },
  { path: "/organization-settings", label: "Organization", icon: Settings },
  { path: "/settings", label: "System Settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { currentOrganization, organizations, switchOrganization } = useOrganization();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        // Force reload to clear all state and redirect to auth
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback: still redirect even if there's an error
      window.location.href = "/";
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return "User";
  };

  return (
    <div className="w-16 md:w-64 bg-gray-900 text-white flex flex-col h-screen">
      {/* Logo */}
      <div className="p-3 md:p-6 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white hidden md:block">Sortify</span>
        </div>
      </div>

      {/* Organization Selector */}
      <div className="p-2 md:p-4 border-b border-gray-700 flex-shrink-0">
        <div className="text-xs text-gray-300 uppercase tracking-wide mb-2 font-medium hidden md:block">Organization</div>
        <Select 
          value={currentOrganization?.id || ""} 
          onValueChange={switchOrganization}
        >
          <SelectTrigger className="w-full bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation Menu - Scrollable */}
      <nav className="flex-1 p-2 md:p-4 space-y-1 md:space-y-2 overflow-y-auto min-h-0">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/dashboard" && location === "/");
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center space-x-3 px-2 md:px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive 
                  ? "bg-gray-700 text-white font-medium" 
                  : "text-gray-200 hover:bg-gray-800 hover:text-white"
              }`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium hidden md:block">{item.label}</span>
              </div>
            </Link>
          );
        })}
        
        <div className="border-t border-gray-700 my-4 pt-4">
          <div className="text-xs text-gray-300 uppercase tracking-wide mb-2 px-2 md:px-3 font-medium hidden md:block">Administration</div>
          {adminItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center space-x-3 px-2 md:px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-gray-700 text-white font-medium" 
                    : "text-gray-200 hover:bg-gray-800 hover:text-white"
                }`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium hidden md:block">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile - Always visible at bottom */}
      <div className="p-2 md:p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-white">{getUserInitials()}</span>
          </div>
          <div className="flex-1 hidden md:block min-w-0">
            <div className="text-sm font-medium text-white truncate">{getUserName()}</div>
            <div className="text-xs text-gray-300 truncate">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-300 hover:text-white hover:bg-gray-800 p-1 flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
