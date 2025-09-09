import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Brain, AlertTriangle, Users, BarChart3, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Zero-Day IDS</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Advanced Zero-Day
              <span className="text-primary block">Attack Detection</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Protect your network with AI-powered intrusion detection. Leverage machine learning 
              to identify unknown threats and zero-day attacks before they compromise your systems.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Demo Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10 data-grid opacity-20"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Advanced Security Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive IDS platform combines multiple ML models with real-time monitoring
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="cyber-glow">
              <CardContent className="p-6">
                <Brain className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  ML-Powered Detection
                </h3>
                <p className="text-muted-foreground">
                  Multiple machine learning models including Random Forest, Isolation Forest, One Class SVM, and Deep Autoencoders for superior threat detection.
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-glow">
              <CardContent className="p-6">
                <AlertTriangle className="h-12 w-12 text-warning mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Zero-Day Protection
                </h3>
                <p className="text-muted-foreground">
                  Advanced anomaly detection to identify previously unknown attack patterns and zero-day exploits.
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-glow">
              <CardContent className="p-6">
                <BarChart3 className="h-12 w-12 text-success mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Real-time Analytics
                </h3>
                <p className="text-muted-foreground">
                  Comprehensive dashboards with accuracy metrics, confusion matrices, and detailed classification reports.
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-glow">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-accent mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  User Management
                </h3>
                <p className="text-muted-foreground">
                  Role-based access control with admin approval workflows and comprehensive user management.
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-glow">
              <CardContent className="p-6">
                <Lock className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Secure Architecture
                </h3>
                <p className="text-muted-foreground">
                  Enterprise-grade security with encrypted data transmission and secure model training environments.
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-glow">
              <CardContent className="p-6">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  24/7 Monitoring
                </h3>
                <p className="text-muted-foreground">
                  Continuous network monitoring with instant alerts and automated response capabilities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Secure Your Network?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join organizations worldwide trusting our AI-powered security solutions
          </p>
          <Link to="/signup">
            <Button size="lg" className="cyber-glow">
              Start Your Free Trial Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center space-x-3">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">Zero-Day IDS</span>
            <span className="text-muted-foreground">© 2024 All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;