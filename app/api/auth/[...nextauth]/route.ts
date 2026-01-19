import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { supabase } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user repo',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        try {
          // Save user to Supabase using github_id as primary identifier
          const { error } = await supabase
            .from('users')
            .upsert({
              email: user.email || null, // Allow null email
              github_id: account.providerAccountId,
              github_username: (profile as any)?.login || user.name,
              github_token: account.access_token,
            }, {
              onConflict: 'github_id' // Use github_id instead of email
            });
          
          if (error) {
            console.error('Error saving user to Supabase:', error);
          }
        } catch (error) {
          console.error('Supabase error:', error);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub) {
        try {
          // Fetch user from Supabase using github_id from token
          const { data } = await supabase
            .from('users')
            .select('id, github_token, github_id')
            .eq('github_id', token.sub)
            .single();
          
          if (data) {
            (session.user as any).id = data.id;
            session.accessToken = data.github_token;
          }
        } catch (error) {
          console.error('Error fetching user from Supabase:', error);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
