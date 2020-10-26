import {Box, Button} from "@chakra-ui/core";
import {Formik, Form} from "formik";
import {withUrqlClient} from "next-urql";
import React, {useState} from "react";
import {InputField} from "../components/InputField";
import {Wrapper} from "../components/Wrapper";
import {useForgotPasswordMutation} from "../generated/graphql";
import {createUrqlClient} from "../utils/createUrqlClient";

const ForgotPassword: React.FC<{}> = ({}) => {
    const [complete, setComplete] = useState(true);
    const [, forgotPassword] = useForgotPasswordMutation();
    return (
        <Wrapper variant="small">
            <Formik
                initialValues={{email: ""}}
                onSubmit={async (values) => {
                    await forgotPassword(values);
                    setComplete(true);
                }}
            >
                {({isSubmitting}) =>
                    complete ? (
                        <Box>
                            If an account we that email exists, we sent you an
                            email
                        </Box>
                    ) : (
                        <Form>
                            <InputField
                                name="email"
                                placeholder="email"
                                label="Email"
                            />
                            <Button
                                mt={4}
                                type="submit"
                                isLoading={isSubmitting}
                                variantColor="teal"
                            >
                                Submit
                            </Button>
                        </Form>
                    )
                }
            </Formik>
        </Wrapper>
    );
};

export default withUrqlClient(createUrqlClient)(ForgotPassword);
