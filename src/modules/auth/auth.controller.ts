import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { generateToken } from "../../utils/jwt";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      email,
      password: hashedPassword,
    });

    res.json({ message: "User registered" });
  } catch (error: any) {
    console.error("DETAILED ERROR:", error.detail || error.message);
    res.status(500).json({ error: "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (user.length === 0) {
  return res.status(404).json({ message: "User not found" });
}


  const isValid = await bcrypt.compare(password, user[0].password);
  if (!isValid) return res.status(401).json({ message: "Invalid password" });

  const token = generateToken(user[0].id);

  res.json({ token });
}
