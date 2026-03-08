import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  especialidade: "Médico" | "Enfermeiro" | "Técnico" | "Socorrista" | "Gestor" | "Administrador";
  registro_profissional: string;
  cargo: "admin" | "equipe" | "gestor";
  hidden: boolean;
  is_account_only: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  needsProfile: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    profileData: Omit<Profile, "id" | "user_id">,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (e) {
      console.error("Error checking admin role:", e);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const safeSetAuth = (next: { session: Session | null; user: User | null }) => {
      if (!isMounted) return;
      setSession(next.session);
      setUser(next.user);
    };

    // Listener for ONGOING auth changes (does NOT control isLoading)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      safeSetAuth({ session: nextSession, user: nextSession?.user ?? null });

      if (nextSession?.user) {
        // Fire and forget - don't await, don't set loading
        fetchProfile(nextSession.user.id).then((p) => {
          if (isMounted) setProfile(p);
        });
        checkAdminRole(nextSession.user.id).then((v) => {
          if (isMounted) setIsAdmin(v);
        });
      } else {
        if (isMounted) {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    });

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        safeSetAuth({ session: initialSession, user: initialSession?.user ?? null });

        if (initialSession?.user) {
          const [p, admin] = await Promise.all([
            fetchProfile(initialSession.user.id),
            checkAdminRole(initialSession.user.id),
          ]);
          if (isMounted) {
            setProfile(p);
            setIsAdmin(admin);
          }
        } else {
          if (isMounted) {
            setProfile(null);
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, _profileData: Omit<Profile, "id" | "user_id">) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });

    // IMPORTANT: we do NOT insert into `profiles` here.
    // At this moment the user may not be authenticated yet (email confirmation flow),
    // and RLS will correctly block profile creation.
    // The profile will be created after login via the /complete-profile screen.

    return { error: error ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  const needsProfile = !!user && !isLoading && !profile;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAdmin,
        needsProfile,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
