import {UsernamePasswordInput} from "../resolvers/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
    const {email, username, password} = options;
    if (!email.includes("@")) {
        return [{field: "email", message: "Invalid Email"}];
    }

    if (username.length <= 2) {
        return [
            {
                field: "username",
                message: "Length must be greater than 2",
            },
        ];
    }

    if (username.includes("@")) {
        return [
            {
                field: "username",
                message: "Cannot have @ symbol",
            },
        ];
    }

    if (password.length <= 2) {
        return [
            {
                field: "password",
                message: "Length must be greater than 2",
            },
        ];
    }

    return null;
};
