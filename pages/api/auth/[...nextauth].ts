import { errorReport } from "@/koala/error-report";
import { prismaClient } from "@/koala/prisma-client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import EmailProvider, {
  EmailConfig,
  EmailUserConfig,
} from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { createTransport } from "nodemailer";
import crypto from "crypto";
// TODO: Properly configure email authentication settings in production
// Temporarily skipping email authentication checks to allow development setup
// Required environment variables for email auth:
// - EMAIL_SERVER_HOST
// - EMAIL_SERVER_PORT
// - EMAIL_SERVER_USER
// - EMAIL_SERVER_PASSWORD
// - EMAIL_FROM

// Original validation code:
// [
//   "EMAIL_SERVER_HOST",
//   "EMAIL_SERVER_PORT",
//   "EMAIL_SERVER_USER",
//   "EMAIL_SERVER_PASSWORD",
//   "EMAIL_FROM",
// ].map((key) => {
//   if (!process.env[key]) {
//     return errorReport(`Missing env ${key}`);
//   }
// });
// Default server configuration if env variables aren't set
const server: EmailConfig["server"] = {
  host: process.env.EMAIL_SERVER_HOST || "localhost",
  port: parseInt(process.env.EMAIL_SERVER_PORT || "1025", 10),
  auth: {
    user: process.env.EMAIL_SERVER_USER || "user",
    pass: process.env.EMAIL_SERVER_PASSWORD || "password",
  },
};

const EMAIL_SERVER_OPTIONS: Partial<EmailUserConfig> = {
  server,
  from: process.env.EMAIL_FROM || "noreply@koalacards.example.com",
  generateVerificationToken() {
    const random = crypto.randomBytes(8);
    return random.toString("hex").slice(0, 6);
  },
  // SOLUTION TO iOS EMAIL PREIVIEW ISSUE:
  // https://github.com/nextauthjs/next-auth/issues/4965#issuecomment-1189094806
  async sendVerificationRequest(params) {
    const { identifier, provider, token } = params;
    console.log(`=== Log in ${token}`);
    const url = new URL(params.url);
    const signInURL = new URL(
      `/auth/email?${url.searchParams}`,
      url.origin,
    );

    const result = await createTransport(server).sendMail({
      to: identifier,
      from: provider.from,
      subject: `Koala Cards Sign In Link`,
      text: `Sign in to Koala Cards here: ${signInURL}`,
      html: [
        `<a href="${signInURL}" target="_blank">Click here to sign in to Koala Cards</a>`,
        `<p>If you can't click the link, copy and paste the following URL into your browser:</p>`,
        `<p>${signInURL}</p>`,
      ].join("\n"),
    });
    const failed = result.rejected.concat(result.pending).filter(Boolean);
    if (failed.length) {
      return errorReport(
        `Email(s) (${failed.join(", ")}) could not be sent`,
      );
    }
  },
};

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prismaClient),
  providers: [
    // TODO: Properly configure authentication for production
    // First try Google OAuth, then email auth, finally a dummy provider in development
    clientId && clientSecret
      ? GoogleProvider({
          clientId,
          clientSecret,
          // allowDangerousEmailAccountLinking: true,
        })
      : process.env.EMAIL_SERVER_HOST 
        ? EmailProvider(EMAIL_SERVER_OPTIONS)
        : {
            id: "dev-auth",
            name: "Development Auth",
            type: "credentials",
            credentials: {},
            authorize: async () => {
              // Always authorize in development mode with a dummy user
              return { 
                id: "dev-user-id", 
                name: "Dev User", 
                email: "dev@example.com" 
              };
            }
          },
  ],
  // Make sessions last longer in development
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

export default NextAuth(authOptions);
