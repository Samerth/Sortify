import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import crypto from "crypto";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('🔍 LocalStrategy: Looking up user:', username);
        const user = await storage.getUserByUsername(username);
        console.log('🔍 LocalStrategy: User found:', !!user);
        
        if (!user) {
          console.log('🔍 LocalStrategy: No user found');
          return done(null, false);
        }
        
        console.log('🔍 LocalStrategy: Comparing passwords...');
        const passwordMatch = await comparePasswords(password, user.password);
        console.log('🔍 LocalStrategy: Password match:', passwordMatch);
        
        if (!passwordMatch) {
          console.log('🔍 LocalStrategy: Password mismatch');
          return done(null, false);
        }
        
        console.log('🔍 LocalStrategy: Authentication successful');
        return done(null, user);
      } catch (error) {
        console.error('🔍 LocalStrategy: Error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, firstName, lastName, invitationToken } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email address is already registered with an organization. Please use a different email or contact your administrator." });
      }

      // Check if there's an invitation token
      let invitation = null;
      if (invitationToken) {
        invitation = await storage.getInvitationByToken(invitationToken);
        if (!invitation) {
          console.log('⚠️ Invalid invitation token provided, proceeding with normal registration');
          // Don't block registration, just proceed without organization assignment
        } else {
          // Verify email matches invitation
          if (invitation.email !== email) {
            return res.status(400).json({ message: "Email must match the invited email address" });
          }
        }
      }

      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        profileImageUrl: null,
        password: await hashPassword(password),
      });

      // If there's an invitation, add user to organization
      if (invitation) {
        await storage.addOrganizationMember({
          id: crypto.randomUUID(),
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          createdAt: new Date(),
        });
        
        // Mark invitation as used
        await storage.markInvitationAsUsed(invitation.id);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName 
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    console.log('🔐 Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('🔐 Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('🔐 Login failed: Invalid credentials for', req.body.username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('🔐 Session login error:', loginErr);
          return next(loginErr);
        }
        console.log('🔐 Login successful for:', user.email);
        res.status(200).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destruction error:', sessionErr);
          return next(sessionErr);
        }
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  // User info route
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = req.user as SelectUser;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};