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
import {UsernamePasswordInput} from "./UsernamePasswordInput";
import {sendEmail} from "../utils/sendEmail";
import {v4} from "uuid";
import {getConnection} from "typeorm";

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
    @Mutation(() => UserResponse)
    async changePassword(
        @Arg("token") token: string,
        @Arg("newPassword") newPassword: string,
        @Ctx() {redis, req}: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: "newPassword",
                        message: "Length must be greater than 2",
                    },
                ],
            };
        }
        const key = FORGET_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "Token Expired!",
                    },
                ],
            };
        }

        const userIdNum = parseInt(userId);
        const user = await User.findOne(userIdNum);

        if (!user) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "User doesn't exist!",
                    },
                ],
            };
        }

        const hashedPassword = await argon2.hash(newPassword);
        user.password = hashedPassword;
        await User.update({id: userIdNum}, {password: hashedPassword});
        redis.del(key);
        req.session!.userId = user.id;
        return {user};
    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() {redis}: MyContext
    ) {
        const user = await User.findOne({where: {email}});
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
        @Ctx() {req}: MyContext
    ): Promise<UserResponse> {
        const {username, email, password} = options;
        const errors = validateRegister(options);

        if (errors) {
            return {errors};
        }

        const hashedPassword = await argon2.hash(password);
        let user;

        try {
            const result = await getConnection()
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({username, email, password: hashedPassword})
                .returning("*")
                .execute();
            user = result.raw[0];
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
    users(): Promise<User[]> {
        return User.find({});
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        @Ctx() {req}: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne(
            usernameOrEmail.includes("@")
                ? {where: {email: usernameOrEmail}}
                : {where: {username: usernameOrEmail}}
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
    me(@Ctx() {req}: MyContext) {
        if (!req.session!.userId) {
            return null;
        }
        return User.findOne(req.session!.userId);
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
