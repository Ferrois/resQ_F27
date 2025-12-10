import React, { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Separator,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useApi } from "../Context/ApiContext";

function Login() {
  const navigate = useNavigate();
  const { login, auth, isLoadingSession } = useApi();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingSession && auth?.accessToken) {
      navigate("/");
    }
  }, [auth?.accessToken, isLoadingSession, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const response = await login(username, password);
    setLoading(false);
    if (response.success) {
      navigate("/");
    } else {
      setError(response.error?.message || "Unable to login");
    }
  };

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      _dark={{ bg: "gray.950" }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Card.Root
        w="100%"
        maxW="420px"
        bg="white"
        _dark={{ bg: "gray.900" }}
        shadow="lg"
        borderWidth="1px"
      >
        <Card.Header pb={0}>
          <Heading size="lg">Welcome back</Heading>
          <Text mt={2} color="gray.500">
            Login with your username and password
          </Text>
        </Card.Header>
        <Card.Body>
          <VStack as="form" onSubmit={handleSubmit} spacing={4} align="stretch">
            <Stack spacing={2}>
              <Text fontWeight="medium">Username</Text>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </Stack>
            <Stack spacing={2}>
              <Text fontWeight="medium">Password</Text>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </Stack>

            {error && (
              <Alert.Root status="error" borderRadius="md">
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}

            <Button
              type="submit"
              colorPalette="blue"
              isLoading={loading || isLoadingSession}
              loadingText="Signing in"
            >
              Login
            </Button>


            <Text textAlign="center" color="gray.500" fontSize="sm">
              Don&apos;t have an account?{" "}
              <Button as={RouterLink} to="/register" variant="link" colorPalette="blue" size="sm">
                Register
              </Button>
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}

export default Login;
