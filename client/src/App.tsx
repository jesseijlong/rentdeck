import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ChecklistPage from "@/pages/ChecklistPage";
import Login from "@/components/Login";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/checklist/:id" component={ChecklistPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Gate() {
  const qc = useQueryClient();
  const [unlocked, setUnlocked] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/auth/me`);
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  // Auth disabled (no password configured) — go straight in.
  if (data?.authEnabled === false) {
    return <AppRouter />;
  }

  if (!data?.authenticated && !unlocked) {
    return <Login onSuccess={() => { setUnlocked(true); qc.invalidateQueries(); }} />;
  }

  return <AppRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <Gate />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
