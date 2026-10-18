import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/hooks/use-query-client';
import { SettingsProvider } from '@/hooks/use-settings-context';
import { ProtectedRoute } from '@/components/protected-route';
import { AppLayout } from '@/components/app-layout';
import { AuthPage } from '@/pages/auth-page';
import { DashboardPage } from '@/pages/dashboard';
import { ProductsPage } from '@/pages/products';
import { SalesPage } from '@/pages/sales';
import { SettingsPage } from '@/pages/settings';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <QueryProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
