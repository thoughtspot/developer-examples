import React from "react";
import { supabase } from "../supabase";
import { User } from "@supabase/supabase-js";

export const useAuth = () => {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        supabase.auth.getSession()
            .then(({ data, error }) => {
                if (error) {
                    throw error;
                }
                setUser(data.session?.user ?? null);
                console.log('session', data);
                setLoading(false);
            });

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            console.log('session', session);
            setLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const logout = React.useCallback(() => {
        return supabase.auth.signOut();
    }, []);

    return { user, loading, isAuthenticated: !!user, logout };
};