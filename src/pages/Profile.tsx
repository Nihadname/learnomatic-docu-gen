import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserCircle, Mail, Calendar, LogOut, Settings, History, Key } from 'lucide-react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to view this page');
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-t-transparent border-primary animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect via the useEffect hook
  }
  
  // Calculate account creation date
  const createdAt = user.created_at ? new Date(user.created_at) : new Date();
  const accountAge = formatDistanceToNow(createdAt, { addSuffix: true });
  
  // Extract user data
  const fullName = user.user_metadata?.full_name || 'User';
  const email = user.email || '';
  const provider = user.app_metadata?.provider || 'email';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            My Profile
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Manage your account and view your settings
          </p>
        </AnimatedContainer>

        <div className="max-w-4xl mx-auto">
          <AnimatedContainer animation="fade" delay={100}>
            <GlassCard variant="elevated" className="p-8 mb-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center">
                  <UserCircle size={64} />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">{fullName}</h2>
                  
                  <div className="flex flex-col md:flex-row gap-4 text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Mail size={16} />
                      <span>{email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>Joined {accountAge}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      variant="destructive" 
                      className="gap-2"
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </AnimatedContainer>
          
          <AnimatedContainer animation="fade" delay={200}>
            <Tabs defaultValue="account">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="account">Account Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              
              <TabsContent value="account">
                <GlassCard className="p-6">
                  <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
                    <Settings size={20} />
                    <span>Account Information</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 items-center border-b border-border pb-4">
                      <span className="font-medium">Full Name</span>
                      <span className="col-span-2">{fullName}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 items-center border-b border-border pb-4">
                      <span className="font-medium">Email</span>
                      <span className="col-span-2">{email}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 items-center border-b border-border pb-4">
                      <span className="font-medium">Auth Provider</span>
                      <span className="col-span-2 capitalize">{provider}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 items-center border-b border-border pb-4">
                      <span className="font-medium">Account Created</span>
                      <span className="col-span-2">{createdAt.toLocaleDateString()}</span>
                    </div>
                    
                    <div className="pt-4">
                      <Button variant="outline" className="gap-2">
                        <Settings size={16} />
                        <span>Edit Profile</span>
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>
              
              <TabsContent value="activity">
                <GlassCard className="p-6">
                  <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
                    <History size={20} />
                    <span>Recent Activity</span>
                  </h3>
                  
                  <div className="text-center py-12 text-muted-foreground">
                    <History size={40} className="mx-auto mb-4 opacity-50" />
                    <h4 className="text-lg font-medium mb-2">No recent activity</h4>
                    <p>Your activity history will appear here</p>
                  </div>
                </GlassCard>
              </TabsContent>
              
              <TabsContent value="security">
                <GlassCard className="p-6">
                  <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
                    <Key size={20} />
                    <span>Security Settings</span>
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-border pb-4">
                      <div>
                        <h4 className="font-medium">Password</h4>
                        <p className="text-sm text-muted-foreground">Update your password</p>
                      </div>
                      <Button variant="outline" className="gap-2">
                        <Key size={16} />
                        <span>Change Password</span>
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-border pb-4">
                      <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline" className="gap-2">
                        <span>Set Up</span>
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center pb-4">
                      <div>
                        <h4 className="font-medium">Sessions</h4>
                        <p className="text-sm text-muted-foreground">Manage active sessions</p>
                      </div>
                      <Button variant="outline" className="gap-2">
                        <span>View Sessions</span>
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </AnimatedContainer>
        </div>
      </main>

      <footer className="bg-background border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LearnOmatic | AI-Powered Learning & Documentation Assistant</p>
        </div>
      </footer>
    </div>
  );
};

export default Profile; 