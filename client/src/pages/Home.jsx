import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link as ChakraLink,
  Separator,
  Stack,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { useApi } from "../Context/ApiContext";
import Logo from "../components/app/Logo";

function NavBar() {
  const { token, logout } = useApi();

  return (
    <Box as="nav" bg="bg.canvas" borderBottomWidth="1px" py="4">
      <Container maxW="7xl">
        <Flex justify="space-between" align="center">
          <Link to="/">
            <Heading size="lg" color="blue.500">
              <HStack>
                <Logo /> resQ
              </HStack>
            </Heading>
          </Link>
          <Stack direction="row" gap="4" align="center">
            {token ? (
              <>
                <ChakraLink as={Link} to="/dashboard">
                  Dashboard
                </ChakraLink>
                <Button variant="ghost" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <ChakraLink as={Link} to="/login">
                  Sign In
                </ChakraLink>
                <Button as={Link} to="/register" colorPalette="blue">
                  Get Started
                </Button>
              </>
            )}
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}

function Footer() {
  return (
    <Box as="footer" bg="bg.canvas" borderTopWidth="1px" py="8" mt="auto">
      <Container maxW="7xl">
        <Stack gap="6">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap="6">
            <VStack align="flex-start" gap="2">
              <Heading size="md" color="blue.500">
                ResQ
              </Heading>
              <Text color="fg.muted" maxW="sm">
                The winning submission to BuildingBloCS December Conference 2025 by team F27.
              </Text>
            </VStack>
            {/* <Stack direction={{ base: "column", md: "row" }} gap="8">
              <VStack align="flex-start" gap="2">
                <Text fontWeight="semibold">Product</Text>
                <ChakraLink href="#" color="fg.muted">
                  Features
                </ChakraLink>
                <ChakraLink href="#" color="fg.muted">
                  Pricing
                </ChakraLink>
                <ChakraLink href="#" color="fg.muted">
                  Documentation
                </ChakraLink>
              </VStack>
              <VStack align="flex-start" gap="2">
                <Text fontWeight="semibold">Company</Text>
                <ChakraLink href="#" color="fg.muted">
                  About
                </ChakraLink>
                <ChakraLink href="#" color="fg.muted">
                  Blog
                </ChakraLink>
                <ChakraLink href="#" color="fg.muted">
                  Contact
                </ChakraLink>
              </VStack>
              <VStack align="flex-start" gap="2">
                <Text fontWeight="semibold">Legal</Text>
                <ChakraLink href="#" color="fg.muted">
                  Privacy
                </ChakraLink>
                <ChakraLink href="#" color="fg.muted">
                  Terms
                </ChakraLink>
              </VStack>
            </Stack> */}
          </Flex>
          <Separator />
          <Text textAlign="center" color="fg.muted" fontSize="sm">
            © {new Date().getFullYear()} ResQ. All rights reserved.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

function Hero() {
  return (
    <Box as="section" bg="bg.surface" py={{ base: "16", md: "24" }} position="relative" overflow="hidden">
      {/* Background decoration */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="to-br"
        gradientFrom="blue.50"
        gradientTo="purple.50"
        opacity="0.3"
        _dark={{
          gradientFrom: "blue.950",
          gradientTo: "purple.950",
        }}
        zIndex="0"
      />
      <Container maxW="7xl" position="relative" zIndex="1">
        <VStack gap="8" textAlign="center" maxW="4xl" mx="auto">
          <Heading size={{ base: "3xl", md: "4xl" }} fontWeight="bold" lineHeight="1.2">
            Rescue All That Matters
            <br />
            <Text as="span" bgGradient="to-r" gradientFrom="blue.500" gradientTo="purple.500" bgClip="text">
              With ResQ
            </Text>
          </Heading>
          <Text fontSize={{ base: "lg", md: "xl" }} color="fg.muted" maxW="2xl" lineHeight="1.6">
            ResQ is a comprehensive emergency response platform that connects communities, coordinates rescue operations, and
            ensures faster response times during critical situations. This serves as a proof of concept submission for team F27 to
            BuildingBloCS Hackathon 2025 December Conference.
          </Text>
          <Stack direction={{ base: "column", sm: "row" }} gap="4" justify="center">
            <Button as={Link} to="/register" size="lg" colorPalette="blue" px="8">
              Get Started
            </Button>
            <Button as={Link} to="/login" size="lg" variant="outline" px="8">
              Sign In
            </Button>
          </Stack>
        </VStack>
      </Container>
    </Box>
  );
}

function Features() {
  const features = [
    {
      title: "Real-Time Coordination",
      description: "ResQ coordinates rescue in real-time with instant communication and location tracking.",
    },
    {
      title: "Device Drop Detection",
      description: "Using an advanced algorithm, ResQ detects your device when it has been dropped.",
    },
    {
      title: "AI Analysis",
      description: "ResQ analyses the situation to provide quick context to rescuers.",
    },
    {
      title: "Find Public Facilities",
      description: "ResQ searches for the nearest essential facility, such as a defibrilator in critical situations.",
    },
  ];

  return (
    <Box as="section" py="16" bg="bg.canvas">
      <Container maxW="7xl">
        <VStack gap="12">
          <VStack gap="4" textAlign="center" maxW="2xl" mx="auto">
            <Heading size="2xl">Why Choose ResQ?</Heading>
            <Text fontSize="lg" color="fg.muted">
              Everything you need for effective emergency response and community safety
            </Text>
          </VStack>
          <Stack direction={{ base: "column", md: "row" }} gap="8" align="stretch">
            {features.map((feature, index) => (
              <Box key={index} p="6" borderRadius="lg" bg="bg.surface" borderWidth="1px" flex="1">
                <VStack align="flex-start" gap="3">
                  <Heading size="md">{feature.title}</Heading>
                  <Text color="fg.muted">{feature.description}</Text>
                </VStack>
              </Box>
            ))}
          </Stack>
        </VStack>
      </Container>
    </Box>
  );
}

function Home() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <NavBar />
      <Hero />
      <Features />
      <Footer />
    </Box>
  );
}

export default Home;
