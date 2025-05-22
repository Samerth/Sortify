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
  LogOut 
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
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { currentOrganization, organizations, switchOrganization } = useOrganization();

  const handleLogout = () => {
    window.location.href = "/api/logout";
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
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">MailFlow</span>
        </div>
      </div>

      {/* Organization Selector */}
      <div className="p-4 border-b border-gray-700">
        <div className="text-xs text-gray-300 uppercase tracking-wide mb-2 font-medium">Organization</div>
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

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/dashboard" && location === "/");
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive 
                  ? "bg-gray-700 text-white font-medium" 
                  : "text-gray-200 hover:bg-gray-800 hover:text-white"
              }`}>
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
        
        <div className="border-t border-gray-700 my-4 pt-4">
          <div className="text-xs text-gray-300 uppercase tracking-wide mb-2 px-3 font-medium">Administration</div>
          {adminItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-gray-700 text-white font-medium" 
                    : "text-gray-200 hover:bg-gray-800 hover:text-white"
                }`}>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">{getUserInitials()}</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{getUserName()}</div>
            <div className="text-xs text-gray-300">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-300 hover:text-white hover:bg-gray-800 p-1"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
