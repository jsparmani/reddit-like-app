import React from "react";
import {Formik, Form} from "formik";
import {Box, Button, Flex, Link} from "@chakra-ui/core";
import {Wrapper} from "../components/Wrapper";
import {InputField} from "../components/InputField";
import {useLoginMutation} from "../generated/graphql";
import {toErrorMap} from "../utils/toErrorMap";
import {useRouter} from "next/router";
import {withUrqlClient} from "next-urql";
import {createUrqlClient} from "../utils/createUrqlClient";
import NextLink from "next/link";

const Login: React.FC<{}> = ({}) => {
    const [, login] = useLoginMutation();
    const router = useRouter();

    return (
        <Wrapper variant="small">
            <Formik
                initialValues={{usernameOrEmail: "", password: ""}}
                onSubmit={async (values, {setErrors}) => {
                    const response = await login(values);
                    if (response.data?.login.errors) {
                        setErrors(toErrorMap(response.data.login.errors));
                    } else if (response.data?.login.user) {
                        router.push("/");
                    }
                }}
            >
                {({isSubmitting}) => (
                    <Form>
                        <InputField
                            name="usernameOrEmail"
                            placeholder="username/email"
                            label="Username/Email"
                        />
                        <Box mt={4}>
                            <InputField
                                name="password"
                                placeholder="password"
                                label="Password"
                                type="password"
                            />
                        </Box>
                        <Flex mt={2}>
                            <Box>
                                <NextLink href="/forgot-password">
                                    <Link ml="auto">Forgot Password?</Link>
                                </NextLink>
                            </Box>
                        </Flex>
                        <Button
                            mt={4}
                            type="submit"
                            isLoading={isSubmitting}
                            variantColor="teal"
                        >
                            Login
                        </Button>
                    </Form>
                )}
            </Formik>
        </Wrapper>
    );
};

export default withUrqlClient(createUrqlClient)(Login);
