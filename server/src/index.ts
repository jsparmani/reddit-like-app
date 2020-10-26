import "reflect-metadata";
import {MyContext} from "./types";
import {UserResolver} from "./resolvers/user";
import {COOKIE_NAME, __prod__} from "./constants";
import express from "express";
import {ApolloServer} from "apollo-server-express";
import {buildSchema} from "type-graphql";
import {PostResolver} from "./resolvers/post";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import {createConnection} from "typeorm";
import { User } from './entities/User';
import { Post } from "./entities/Post";

(async () => {
    const conn = await createConnection({
        type: "postgres",
        database: "lireddit2",
        username: "test",
        password: "test",
        logging: true,
        synchronize: true,
        entities: [Post, User]
    });

    const app = express();

    app.use(
        cors({
            credentials: true,
            origin: "http://localhost:3000",
        })
    );

    const RedisStore = connectRedis(session);
    const redis = new Redis();

    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({
                client: redis,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
                httpOnly: true,
                secure: __prod__,
                sameSite: "lax",
            },
            saveUninitialized: false,
            secret: "fsgsdf86fg69sfghghj",
            resave: false,
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver],
            validate: false,
        }),
        context: ({req, res}): MyContext => ({
            req,
            res,
            redis,
        }),
    });

    apolloServer.applyMiddleware({
        app,
        cors: false,
    });

    app.listen(4000, () => {
        console.log("Server started on port 4000");
    });

    // const post = orm.em.create(Post, {title: "Post1"});
    // await orm.em.persistAndFlush(post);

    // const posts = await orm.em.find(Post, {});
    // console.log(posts);
})();
