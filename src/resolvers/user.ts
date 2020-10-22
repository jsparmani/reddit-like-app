import {User} from "./../entities/User";
import {MyContext} from "./../types";
import {
    Arg,
    Ctx,
    Field,
    InputType,
    Mutation,
    ObjectType,
    Query,
    Resolver,
} from "type-graphql";
import argon2 from "argon2";

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string;

    @Field()
    password: string;
}

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
    async register(
        @Arg("options", () => UsernamePasswordInput)
        options: UsernamePasswordInput,
        @Ctx() {em}: MyContext
    ): Promise<UserResponse> {
        const {username, password} = options;

        if (username.length <= 2) {
            return {
                errors: [
                    {
                        field: "username",
                        message: "Length must be greater than 2",
                    },
                ],
            };
        }

        if (password.length <= 2) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "Length must be greater than 2",
                    },
                ],
            };
        }

        const hashedPassword = await argon2.hash(password);

        const user = em.create(User, {username, password: hashedPassword});
        try {
            await em.persistAndFlush(user);
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
        @Arg("options", () => UsernamePasswordInput)
        options: UsernamePasswordInput,
        @Ctx() {em}: MyContext
    ): Promise<UserResponse> {
        const {username, password} = options;
        const user = await em.findOne(User, {username});
        if (!user) {
            return {
                errors: [
                    {
                        field: "username",
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

        return {
            user,
        };
    }
}
