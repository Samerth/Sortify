import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Organization } from "@shared/schema";

interface OrganizationContextType {
  currentOrganization: (Organization & { role: string }) | null;
  organizations: (Organization & { role: string })[];
  switchOrganization: (orgId: string) => void;
  refreshOrganization: () => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [currentOrganization, setCurrentOrganization] = useState<(Organization & { role: string }) | null>(null);
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["/api/organizations"],
  });

  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      // Auto-select first organization or load from localStorage
      const savedOrgId = localStorage.getItem("selectedOrganizationId");
      const orgToSelect = savedOrgId 
        ? organizations.find(org => org.id === savedOrgId) 
        : organizations[0];
      
      if (orgToSelect) {
        setCurrentOrganization(orgToSelect);
        localStorage.setItem("selectedOrganizationId", orgToSelect.id);
      }
    }
  }, [organizations, currentOrganization]);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem("selectedOrganizationId", orgId);
    }
  };

  const refreshOrganization = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
    if (currentOrganization) {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization.id}`] });
    }
  };

  return (
    <OrganizationContext.Provider 
      value={{
        currentOrganization,
        organizations,
        switchOrganization,
        refreshOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
