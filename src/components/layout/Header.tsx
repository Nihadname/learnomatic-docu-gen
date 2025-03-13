import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  FileText, 
  Home, 
  LogIn, 
  Menu, 
  UserPlus, 
  X,
  UserCircle,
  LogOut,
  Code,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const NavLink = ({ 
  to, 
  icon, 
  label, 
  isActive 
}: { 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean;
}) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300',
      isActive 
        ? 'bg-primary/10 text-primary font-medium' 
        : 'text-foreground/80 hover:bg-primary/5 hover:text-primary'
    )}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navigation = [
    { path: '/', label: 'Home', icon: <Home size={18} /> },
    { path: '/concept-explainer', label: 'AI Explainer', icon: <Brain size={18} /> },
    { path: '/documentation-generator', label: 'Doc Generator', icon: <FileText size={18} /> },
    { path: '/code-reviewer', label: 'Code Reviewer', icon: <Code size={18} /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <header 
      className={cn(
        'fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300',
        isScrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm' 
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link 
          to="/" 
          className="text-xl font-bold flex items-center text-primary"
        >
          <span className="bg-primary text-white p-1 rounded mr-2 text-sm">
            Learn
          </span>
          <span className="text-gradient">Omatic</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
            />
          ))}
        </nav>

        {/* Authentication Buttons - Desktop */}
        <div className="hidden md:flex items-center space-x-2">
          {/* Theme Toggle Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full w-9 h-9" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={16} className="text-slate-700" />
            ) : (
              <Sun size={16} className="text-yellow-300" />
            )}
          </Button>

          {loading ? (
            <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
          ) : user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserCircle size={16} />
                  <span>Profile</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn size={16} />
                  <span>Log In</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="gap-2">
                  <UserPlus size={16} />
                  <span>Sign Up</span>
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full w-9 h-9" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={16} className="text-slate-700" />
            ) : (
              <Sun size={16} className="text-yellow-300" />
            )}
          </Button>
          
          <button
            className="text-foreground p-2 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-lg shadow-lg border-t border-border/50 animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                isActive={location.pathname === item.path}
              />
            ))}
            <div className="h-px w-full bg-border/50 my-2"></div>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
              </div>
            ) : user ? (
              <>
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:bg-primary/5 hover:text-primary rounded-lg"
                >
                  <UserCircle size={18} />
                  <span>Profile</span>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:bg-primary/5 hover:text-primary rounded-lg w-full text-left"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:bg-primary/5 hover:text-primary rounded-lg"
                >
                  <LogIn size={18} />
                  <span>Log In</span>
                </Link>
                <Link 
                  to="/register" 
                  className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:bg-primary/5 hover:text-primary rounded-lg"
                >
                  <UserPlus size={18} />
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
