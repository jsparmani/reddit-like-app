import {__prod__} from "./constants";
import {Post} from "./entities/Post";
import {MikroORM} from "@mikro-orm/core";
import path from "path";

export default {
    dbName: "reddit-like-app",
    user: "test",
    password: "test",
    debug: !__prod__,
    type: "postgresql",
    entities: [Post],
    migrations: {
        path: path.join(__dirname, "./migrations"),
        pattern: /^[\w-]+\d+\.[tj]s$/,
    },
} as Parameters<typeof MikroORM.init>[0];
