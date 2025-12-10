import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Field,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { useApi } from '../Context/ApiContext';
import { toaster } from '../components/ui/toaster';

function Register() {
  const navigate = useNavigate();
  const { publicRequest, setSession } = useApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    birthday: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: '',
    gender: '',
  });
  const [skills, setSkills] = useState([]);
  const [medical, setMedical] = useState([]);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const addSkill = () => {
    setSkills([...skills, { name: '', level: '' }]);
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const updateSkill = (index, field, value) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);
  };

  const addMedical = () => {
    setMedical([...medical, { condition: '', treatment: '', remarks: '' }]);
  };

  const removeMedical = (index) => {
    setMedical(medical.filter((_, i) => i !== index));
  };

  const updateMedical = (index, field, value) => {
    const updated = [...medical];
    updated[index] = { ...updated[index], [field]: value };
    setMedical(updated);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 4) {
      newErrors.username = 'Username must be at least 4 characters';
    }
    if (formData.username.includes(' ')) {
      newErrors.username = 'Username cannot contain spaces';
    }
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    }
    if (!formData.birthday) {
      newErrors.birthday = 'Birthday is required';
    }
    if (!formData.phoneNumber || formData.phoneNumber.trim().length === 0) {
      newErrors.phoneNumber = 'Phone number is required';
    }
    if (!formData.address || formData.address.trim().length === 0) {
      newErrors.address = 'Address is required';
    }
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toaster.create({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        status: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      const { username, name, birthday, phoneNumber, address, password, gender } = formData;
      
      // Filter out empty skills and medical entries
      const validSkills = skills.filter(skill => skill.name.trim() && skill.level);
      const validMedical = medical.filter(med => med.condition.trim());
      
      const response = await publicRequest('POST', '/user/register', {
        username,
        name,
        birthday,
        phoneNumber,
        address,
        password,
        gender,
        medical: validMedical,
        skills: validSkills,
        dependencies: [], // Can be added later
      });

      if (response.success) {
        const { accessToken, refreshToken, user } = response.data;
        if (accessToken && refreshToken && user) {
          setSession({ accessToken, refreshToken, user });
        }

        toaster.create({
          title: 'Success!',
          description: response.data.message || 'Account created successfully',
          status: 'success',
        });

        // Redirect to home or dashboard
        setTimeout(() => {
          navigate('/main');
        }, 1000);
      } else {
        toaster.create({
          title: 'Registration Failed',
          description: response.error?.message || 'Something went wrong',
          status: 'error',
        });
      }
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: 'An unexpected error occurred',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="bg.surface" py="12">
      <Container maxW="2xl">
        <VStack gap="8" align="stretch">
          <Box textAlign="center">
            <Heading size="xl" mb="2">
              Create Your Account
            </Heading>
            <Text color="fg.muted">
              Join ResQ and be part of the rescue community
            </Text>
          </Box>

          <Box
            as="form"
            onSubmit={handleSubmit}
            bg="bg.canvas"
            p="8"
            borderRadius="lg"
            boxShadow="md"
          >
            <Stack gap="6">
              <Field.Root required invalid={!!errors.username}>
                <Field.Label>Username</Field.Label>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter username (min 4 characters)"
                  type="text"
                />
                {errors.username && (
                  <Field.ErrorText>{errors.username}</Field.ErrorText>
                )}
                <Field.HelperText>
                  Username must be at least 4 characters and contain no spaces
                </Field.HelperText>
              </Field.Root>

              <Field.Root required invalid={!!errors.name}>
                <Field.Label>Full Name</Field.Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  type="text"
                />
                {errors.name && (
                  <Field.ErrorText>{errors.name}</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!errors.birthday}>
                <Field.Label>Birthday</Field.Label>
                <Input
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  placeholder="Enter your birthday"
                  type="date"
                />
                {errors.birthday && (
                  <Field.ErrorText>{errors.birthday}</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!errors.phoneNumber}>
                <Field.Label>Phone Number</Field.Label>
                <Input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  type="tel"
                />
                {errors.phoneNumber && (
                  <Field.ErrorText>{errors.phoneNumber}</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!errors.address}>
                <Field.Label>Address</Field.Label>
                <Textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  rows={3}
                />
                {errors.address && (
                  <Field.ErrorText>{errors.address}</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!errors.password}>
                <Field.Label>Password</Field.Label>
                <Input
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (min 8 characters)"
                  type="password"
                />
                {errors.password && (
                  <Field.ErrorText>{errors.password}</Field.ErrorText>
                )}
                <Field.HelperText>
                  Password must be at least 8 characters
                </Field.HelperText>
              </Field.Root>

              <Field.Root required invalid={!!errors.confirmPassword}>
                <Field.Label>Confirm Password</Field.Label>
                <Input
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  type="password"
                />
                {errors.confirmPassword && (
                  <Field.ErrorText>{errors.confirmPassword}</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!errors.gender}>
                <Field.Label>Gender</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="others">Others</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {errors.gender && (
                  <Field.ErrorText>{errors.gender}</Field.ErrorText>
                )}
              </Field.Root>

              {/* Skills Section */}
              <Box>
                <HStack justify="space-between" mb="4">
                  <Heading size="sm">Skills (Optional)</Heading>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addSkill}
                  >
                    Add Skill
                  </Button>
                </HStack>
                {skills.length === 0 && (
                  <Text color="fg.muted" fontSize="sm" mb="4">
                    No skills added. Click "Add Skill" to add your skills.
                  </Text>
                )}
                <Stack gap="4">
                  {skills.map((skill, index) => (
                    <Box
                      key={index}
                      p="4"
                      borderWidth="1px"
                      borderRadius="md"
                      bg="bg.canvas"
                    >
                      <HStack justify="flex-end" mb="2">
                        <IconButton
                          type="button"
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => removeSkill(index)}
                          aria-label="Remove skill"
                        >
                          ×
                        </IconButton>
                      </HStack>
                      <Stack gap="3">
                        <Field.Root>
                          <Field.Label>Skill Name</Field.Label>
                          <Input
                            value={skill.name}
                            onChange={(e) =>
                              updateSkill(index, 'name', e.target.value)
                            }
                            placeholder="e.g., First Aid, CPR"
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Skill Level</Field.Label>
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={skill.level}
                              onChange={(e) =>
                                updateSkill(index, 'level', e.target.value)
                              }
                            >
                              <option value="">Select level</option>
                              <option value="adequate">Adequate</option>
                              <option value="proficient">Proficient</option>
                              <option value="professional">Professional</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </Field.Root>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Medical History Section */}
              <Box>
                <HStack justify="space-between" mb="4">
                  <Heading size="sm">Medical History (Optional)</Heading>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addMedical}
                  >
                    Add Medical Issue
                  </Button>
                </HStack>
                {medical.length === 0 && (
                  <Text color="fg.muted" fontSize="sm" mb="4">
                    No medical issues added. Click "Add Medical Issue" if you have
                    any medical conditions.
                  </Text>
                )}
                <Stack gap="4">
                  {medical.map((med, index) => (
                    <Box
                      key={index}
                      p="4"
                      borderWidth="1px"
                      borderRadius="md"
                      bg="bg.canvas"
                    >
                      <HStack justify="flex-end" mb="2">
                        <IconButton
                          type="button"
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => removeMedical(index)}
                          aria-label="Remove medical issue"
                        >
                          ×
                        </IconButton>
                      </HStack>
                      <Stack gap="3">
                        <Field.Root>
                          <Field.Label>Condition *</Field.Label>
                          <Input
                            value={med.condition}
                            onChange={(e) =>
                              updateMedical(index, 'condition', e.target.value)
                            }
                            placeholder="e.g., Diabetes, Asthma"
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Treatment</Field.Label>
                          <Input
                            value={med.treatment}
                            onChange={(e) =>
                              updateMedical(index, 'treatment', e.target.value)
                            }
                            placeholder="Current treatment or medication"
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Remarks</Field.Label>
                          <Textarea
                            value={med.remarks}
                            onChange={(e) =>
                              updateMedical(index, 'remarks', e.target.value)
                            }
                            placeholder="Additional notes"
                            rows={2}
                          />
                        </Field.Root>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Button
                type="submit"
                loading={loading}
                loadingText="Creating Account..."
                width="full"
                size="lg"
                colorPalette="blue"
              >
                Create Account
              </Button>
            </Stack>
          </Box>

          <Box textAlign="center">
            <Text color="fg.muted">
              Already have an account?{' '}
              <Link to="/login">
                <Text as="span" color="blue.500" fontWeight="medium">
                  Sign in
                </Text>
              </Link>
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default Register;
