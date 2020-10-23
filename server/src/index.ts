import {MyContext} from "./types";
import {UserResolver} from "./resolvers/user";
import "reflect-metadata";
import {__prod__} from "./constants";
import {MikroORM} from "@mikro-orm/core";
import microConfig from "./mikro-orm.config";
import express from "express";
import {ApolloServer} from "apollo-server-express";
import {buildSchema} from "type-graphql";
import {PostResolver} from "./resolvers/post";

import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

(async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up();

    const app = express();

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient();

    app.use(
        session({
            name: "qid",
            store: new RedisStore({
                client: redisClient,
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
            em: orm.em,
            req,
            res,
        }),
    });

    apolloServer.applyMiddleware({app});

    app.listen(4000, () => {
        console.log("Server started on port 4000");
    });

    // const post = orm.em.create(Post, {title: "Post1"});
    // await orm.em.persistAndFlush(post);

    // const posts = await orm.em.find(Post, {});
    // console.log(posts);
})();
