import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, CheckCircle2 } from "lucide-react";
import logo from "@/assets/solely-logo.svg";

// Production URL for email verification redirect
const SITE_URL = "https://sole-ly-marketplace-first-business.pages.dev";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    const checkUser = async () => {
      // Small delay to ensure signOut has completed if coming from logout
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(redirectTo);
      }
    };
    checkUser();
  }, [navigate, redirectTo]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error("You must accept the Terms & Conditions to create an account");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${SITE_URL}/`
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create customer profile
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
        });

        // Show prominent email verification message
        setRegisteredEmail(email);
        setShowEmailSent(true);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Show email verification success screen
  if (showEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Check Your Email!</CardTitle>
            <CardDescription className="text-base mt-2">
              We've sent a verification link to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email display */}
            <div className="bg-muted/50 border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                <Mail className="w-5 h-5 text-primary" />
                <span>{registeredEmail}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">📧 Next Steps:</h4>
              <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
                <li>Open your email inbox</li>
                <li>Look for an email from <strong>Solely Marketplace</strong></li>
                <li>Click the <strong>"Confirm your email"</strong> link</li>
                <li>You'll be redirected back to sign in</li>
              </ol>
            </div>

            {/* Didn't receive email */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder.</p>
            </div>

            {/* Back to sign in */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowEmailSent(false);
                setEmail("");
                setPassword("");
                setFullName("");
                setTermsAccepted(false);
              }}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Solely Marketplace" className="h-16 w-auto mx-auto mb-4" />
          <CardTitle className="text-2xl">Welcome to Solely</CardTitle>
          <CardDescription>Sign in or create an account to start shopping</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="buyer-terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="buyer-terms" className="text-sm font-normal leading-relaxed">
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="text-primary underline hover:no-underline">
                      Terms & Conditions
                    </Link>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !termsAccepted}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
