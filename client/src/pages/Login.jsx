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
import { FiArrowLeft } from "react-icons/fi";
import { useApi } from "../Context/ApiContext";
import { toaster } from "../components/ui/toaster";
import { usePushNotifications } from "../hooks/usePushNotifications";

function Login() {
  const navigate = useNavigate();
  const { login, auth, isLoadingSession } = useApi();
  const { subscribe, isSupported } = usePushNotifications();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingSession && auth?.accessToken) {
      navigate("/main");
    }
  }, [auth?.accessToken, isLoadingSession, navigate]);

  const requestPermissions = async () => {
    const missingPermissions = [];

    // Request location permission
    if (navigator.permissions) {
      try {
        const locationStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (locationStatus.state === 'denied' || locationStatus.state === 'prompt') {
          missingPermissions.push('location');
        }
      } catch (err) {
        // Fallback: try to get location to trigger permission prompt
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 1000 });
          });
        } catch {
          missingPermissions.push('location');
        }
      }
    } else {
      // Fallback for browsers without permissions API
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 1000 });
        });
      } catch {
        missingPermissions.push('location');
      }
    }

    // Request camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        missingPermissions.push('camera');
      }
    }

    // Show toast if permissions are missing
    if (missingPermissions.length > 0) {
      const missingList = missingPermissions.join(' and ');
      toaster.warning({
        status: 'warning',
        title: 'Permissions Required',
        description: `The app may not work correctly without ${missingList} permissions. Please enable them in your browser settings.`,
        duration: 5000,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const response = await login(username, password);
    setLoading(false);
    if (response.success) {
      // Request permissions after successful login
      await requestPermissions();
      
      // Subscribe to push notifications automatically
      if (isSupported) {
        subscribe().catch((err) => {
          console.error("Failed to subscribe to push notifications:", err);
          // Don't block login if push subscription fails
        });
      }
      
      navigate("/main");
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
          <Button
            as={RouterLink}
            to="/"
            variant="ghost"
            size="sm"
            leftIcon={<FiArrowLeft />}
            alignSelf="flex-start"
            mb={2}
          >
            Back to landing
          </Button>
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
