import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { router } from "./routes.js";
export const app = new Koa();

app.use(cors());
app.use(bodyParser());
app.use(router.allowedMethods());
app.use(router.routes());
