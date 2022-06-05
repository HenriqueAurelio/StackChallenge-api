import Router from "@koa/router";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const router = new Router();

const prisma = new PrismaClient();

router.get("/tweets", async (ctx) => {
  const tweets = await prisma.tweet.findMany({
    include: { user: true },
  });
  ctx.body = tweets;
});

router.post("/tweets", async (ctx) => {
  const [type, token] = ctx.request.headers?.authorization?.split(" ") || [];
  if (!token) {
    ctx.status = 401;
    return;
  }
  try {
    var payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    ctx.status = 401;
    return;
  }
  const tweet = await prisma.tweet.create({
    data: {
      userId: payload.sub,
      text: ctx.request.body.text,
    },
  });

  ctx.body = tweet;
});

router.post("/signup", async (ctx) => {
  const saltRounds = 10;
  const hashPassword = bcrypt.hashSync(ctx.request.body.password, saltRounds);

  try {
    const { password, ...user } = await prisma.user.create({
      data: {
        name: ctx.request.body.name,
        username: ctx.request.body.username,
        email: ctx.request.body.email,
        password: hashPassword,
      },
    });

    const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    ctx.body = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      accessToken,
    };
  } catch (e) {
    if (e.meta && !e.meta.target) {
      ctx.status = 422;
      ctx.body = "Email ou nome de usuário já existe!";
      return;
    }

    ctx.status = 500;
    ctx.body = "Internal Error";
  }
});

router.get("/login", async (ctx) => {
  const [type, token] = ctx.request.headers.authorization.split(" ");
  const [email, plainTextPassword] = Buffer.from(token, "base64")
    .toString()
    .split(":");

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    ctx.status = 404;
    return;
  }

  const passwordMatch = bcrypt.compareSync(plainTextPassword, user.password);

  if (passwordMatch) {
    const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    ctx.body = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      accessToken,
    };
    return;
  }
});
