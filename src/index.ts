import "reflect-metadata";
import {__prod__} from "./constants";
import {MikroORM} from "@mikro-orm/core";
import microConfig from "./mikro-orm.config";
import express from "express";
import {ApolloServer} from "apollo-server-express";
import {buildSchema} from "type-graphql";
import {PostResolver} from "./resolvers/post";

(async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up();

    const app = express();

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver],
            validate: false,
        }),
        context: () => ({
            em: orm.em,
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
