import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Coins,
  Moon,
  Sun,
  Database,
  Loader2,
  LogOut,
  Palette,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSettingsContext } from '@/hooks/use-settings-context';
import { useAuth } from '@/hooks/use-auth';
import { useLoadDemoData } from '@/hooks/use-sales';

export function SettingsPage() {
  const navigate = useNavigate();
  const { settings, update } = useSettingsContext();
  const { signOut, user } = useAuth();
  const loadDemo = useLoadDemoData();
  const [demoOpen, setDemoOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const confirmLoadDemo = () => {
    loadDemo.mutate(undefined, { onSuccess: () => setDemoOpen(false) });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Choose how ShopStock looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                {settings.theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">
                  {settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            >
              Switch to {settings.theme === 'dark' ? 'light' : 'dark'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-primary" />
            Currency
          </CardTitle>
          <CardDescription>Used for all money values across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="currency">Display currency</Label>
            <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm sm:w-[240px]">
              <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
              Indian Rupee (INR ₹)
            </div>
            <p className="text-xs text-muted-foreground">
              All prices and revenue are shown in Indian Rupees (₹).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Demo data */}
      <Card className="border-warning/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-warning" />
            Demo data
          </CardTitle>
          <CardDescription>
            Load 12 sample products and 60 sales spread across the last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm">
            <p className="text-foreground">
              This will <span className="font-semibold">replace all your current products and sales</span> with the demo set.
              Use it to explore charts and features quickly.
            </p>
            <Button
              variant="outline"
              className="mt-3 gap-2 border-warning/40 text-warning hover:bg-warning/10"
              onClick={() => setDemoOpen(true)}
            >
              <Database className="h-3.5 w-3.5" />
              Load demo data
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={demoOpen} onOpenChange={setDemoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all data with demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your existing products and sales, and insert 12 sample products and 60 sales. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLoadDemo}
              disabled={loadDemo.isPending}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {loadDemo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Load demo data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
