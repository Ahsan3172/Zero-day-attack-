import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Search, UserPlus, Shield, User, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const users = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@company.com",
      role: "Admin",
      status: "active",
      lastLogin: "2024-01-15 14:30",
      registeredAt: "2023-12-01"
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@company.com",
      role: "User",
      status: "active",
      lastLogin: "2024-01-15 09:15",
      registeredAt: "2024-01-05"
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike.johnson@company.com",
      role: "User",
      status: "pending",
      lastLogin: "Never",
      registeredAt: "2024-01-14"
    },
    {
      id: 4,
      name: "Sarah Wilson",
      email: "sarah.wilson@company.com",
      role: "User",
      status: "inactive",
      lastLogin: "2024-01-10 16:45",
      registeredAt: "2023-11-20"
    }
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    return role === "Admin" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleApproveUser = (userName: string) => {
    toast({
      title: "User approved",
      description: `${userName} has been approved and can now access the system`,
    });
  };

  const handleRejectUser = (userName: string) => {
    toast({
      title: "User rejected",
      description: `${userName}'s registration has been rejected`,
      variant: "destructive"
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center space-x-2">
              <UsersIcon className="h-5 w-5" />
              <span>Users ({filteredUsers.length})</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{user.name}</h3>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs text-muted-foreground mt-1 space-y-1 sm:space-y-0">
                      <span>Role: {user.role}</span>
                      <span className="hidden sm:inline">Last login: {user.lastLogin}</span>
                      <span className="hidden sm:inline">Registered: {user.registeredAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {user.status === "pending" && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveUser(user.name)}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleRejectUser(user.name)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {user.status === "active" && (
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{users.filter(u => u.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'Admin').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;