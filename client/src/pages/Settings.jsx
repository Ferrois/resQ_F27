import React from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSettings } from "react-icons/fi";
import { useApi } from "../Context/ApiContext";

function Settings() {
  const { logout } = useApi();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.950" }}>
      <Container maxW="lg" py="10">
        <Flex align="center" gap="3" mb="6">
          <Button
            as={RouterLink}
            to="/main"
            leftIcon={<FiArrowLeft />}
            variant="ghost"
          >
            Back to home
          </Button>
          <Flex align="center" gap="2">
            <FiSettings />
            <Heading size="md">Settings</Heading>
          </Flex>
        </Flex>

        <Stack spacing="4">
          <Box
            p="6"
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            _dark={{ bg: "gray.900" }}
            shadow="sm"
          >
            <Heading size="sm" mb="2">
              Account
            </Heading>
            <Text color="gray.600" _dark={{ color: "gray.300" }} mb="4">
              Manage your session and sign out of this device.
            </Text>
            <Button colorPalette="red" onClick={handleLogout}>
              Log out
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default Settings;

