import {validateRegister} from "./../utils/validateRegister";
import {COOKIE_NAME, FORGET_PASSWORD_PREFIX} from "./../constants";
import {User} from "./../entities/User";
import {MyContext} from "./../types";
import {
    Arg,
    Ctx,
    Field,
    Mutation,
    ObjectType,
    Query,
    Resolver,
} from "type-graphql";
import argon2 from "argon2";
import {EntityManager} from "@mikro-orm/postgresql";
import {UsernamePasswordInput} from "./UsernamePasswordInput";
import {sendEmail} from "../utils/sendEmail";
import {v4} from "uuid";

@ObjectType()
class FieldError {
    @Field()
    field: string;

    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User;
}

@Resolver()
export class UserResolver {
    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() {em, redis}: MyContext
    ) {
        const user = await em.findOne(User, {email});
        if (!user) {
            return true;
        }

        const token = v4();
        await redis.set(
            FORGET_PASSWORD_PREFIX + token,
            user.id,
            "ex",
            1000 * 60 * 60 * 24 * 3
        ); // 3 days

        sendEmail(
            email,
            `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`
        );
        return true;
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg("options", () => UsernamePasswordInput)
        options: UsernamePasswordInput,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse> {
        const {username, email, password} = options;
        const errors = validateRegister(options);

        if (errors) {
            return {errors};
        }

        const hashedPassword = await argon2.hash(password);
        let user;

        try {
            const result = await (em as EntityManager)
                .createQueryBuilder(User)
                .getKnexQuery()
                .insert({
                    username,
                    password: hashedPassword,
                    email,
                    created_at: new Date(),
                    updated_at: new Date(),
                })
                .returning("*");
            user = result[0];
        } catch (err) {
            if (err.code === "23505") {
                // Duplicate username error
                return {
                    errors: [
                        {
                            field: "username",
                            message: "Username has already been taken!",
                        },
                    ],
                };
            }
            console.log(err);
        }

        req.session!.userId = user.id;

        return {
            user,
        };
    }

    @Query(() => [User])
    users(@Ctx() {em}: MyContext): Promise<User[]> {
        return em.find(User, {});
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(
            User,
            usernameOrEmail.includes("@")
                ? {email: usernameOrEmail}
                : {username: usernameOrEmail}
        );
        if (!user) {
            return {
                errors: [
                    {
                        field: "usernameOrEmail",
                        message: "That username doesn't exist",
                    },
                ],
            };
        }

        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "Incorrect password",
                    },
                ],
            };
        }

        req.session!.userId = user.id;

        return {
            user,
        };
    }

    @Query(() => User, {nullable: true})
    async me(@Ctx() {em, req}: MyContext) {
        if (!req.session!.userId) {
            return null;
        }
        const user = await em.findOne(User, {id: req.session!.userId});
        return user;
    }

    @Mutation(() => Boolean)
    logout(@Ctx() {req, res}: MyContext) {
        return new Promise((resolve) =>
            req.session?.destroy((err) => {
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log(err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            })
        );
    }
}
