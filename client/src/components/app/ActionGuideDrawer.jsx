import React, { useEffect, useState, useRef } from "react";

import { Badge, Box, Button, Drawer, Flex, Heading, Icon, List, ListItem, Progress, Stack, Tabs, Text } from "@chakra-ui/react";

import { LuCheck, LuHeartPulse, LuTimer, LuPlay, LuSquare } from "react-icons/lu";



const CPR_PHASES = [

  {

    label: "30 Compressions",

    duration: 20,

    cue: "Push hard and fast at 100–120/min, depth 5 cm, full recoil.",

  },

  {

    label: "2 Rescue Breaths",

    duration: 6,

    cue: "Head tilt, chin lift, pinch nose, each breath ~1 sec watching chest rise.",

  },

];



const quickGuides = {

  cpr: [

    "Check responsiveness, call 995, place on a firm surface.",

    "Kneel at the chest, heel of hand at center of sternum, interlock hands.",

    "Give 30 compressions at 100–120/min, depth ~5 cm; allow full recoil.",

    "Open airway (head tilt–chin lift). Pinch nose and seal your mouth.",

    "Give 2 slow breaths (1 sec each). Chest should rise.",

    "Repeat 30 compressions + 2 breaths until help arrives or an AED is ready.",

  ],

  defib: [

    "Turn on the AED and follow voice prompts.",

    "Expose and dry the chest; remove medication patches if present (use gloves).",

    "Place pads: upper right chest and lower left side, per diagram.",

    "Stop touching the patient. Let the AED analyze rhythm.",

    "If advised, loudly say “clear” and press shock. Ensure no one is touching.",

    "Resume CPR immediately for 2 minutes, then let AED re-analyze.",

  ],

  heimlich: [

    "Confirm severe choking (can’t speak/cough). Call 995.",

    "Stand behind, one foot forward for balance.",

    "Make a fist above the navel, thumb in; grasp with other hand.",

    "Deliver quick upward abdominal thrusts until the object clears.",

    "If they become unresponsive, lower to the ground and start CPR.",

  ],

};



function StepList({ steps }) {

  return (

    <List.Root spacing="3">

      {steps.map((step, idx) => (

        <List.Item key={idx} display="flex" gap="3">

          <Icon as={LuCheck} color="green.500" boxSize="5" />

          <Text>{step}</Text>

        </List.Item>

      ))}

    </List.Root>

  );

}



function BpmTimer({ bpm = 103 }) {

  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef(null);

  const audioContextRef = useRef(null);



  // Generate a beep sound using Web Audio API

  const playBeep = () => {

    if (!audioContextRef.current) {

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    }

    const audioContext = audioContextRef.current;

    const oscillator = audioContext.createOscillator();

    const gainNode = audioContext.createGain();



    oscillator.connect(gainNode);

    gainNode.connect(audioContext.destination);



    oscillator.frequency.value = 800; // Beep frequency in Hz

    oscillator.type = 'sine';



    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);



    oscillator.start(audioContext.currentTime);

    oscillator.stop(audioContext.currentTime + 0.1);

  };



  useEffect(() => {

    if (isRunning) {

      const intervalMs = (60 / bpm) * 1000; // Convert BPM to milliseconds



      // Play immediately

      playBeep();



      // Then play at regular intervals

      intervalRef.current = setInterval(() => {

        playBeep();

      }, intervalMs);

    } else {

      if (intervalRef.current) {

        clearInterval(intervalRef.current);

        intervalRef.current = null;

      }

    }



    return () => {

      if (intervalRef.current) {

        clearInterval(intervalRef.current);

        intervalRef.current = null;

      }

    };

  }, [isRunning, bpm]);



  const handleToggle = () => {

    setIsRunning((prev) => !prev);

  };



  return (

    <Stack borderWidth="1px" borderRadius="lg" p="4" gap="3" bg="bg.canvas" mt="6" >

      <Flex align="center" justify="space-between">
        <Flex align="center" gap="2">

          <LuTimer />

          <Heading size="sm">Compression Rate Timer</Heading>

        </Flex>

        <Badge colorPalette="blue" variant="subtle">

          {bpm} BPM

        </Badge>

      </Flex>



      <Text color="fg.muted" fontSize="sm">

        Follow the beep rhythm for proper compression rate. Recommended: 100-120 compressions per minute.

      </Text>



      <Button

        onClick={handleToggle}

        colorPalette={isRunning ? "red" : "green"}

        leftIcon={isRunning ? <LuSquare /> : <LuPlay />}

        size="md"

        width="100%"

      >

        {isRunning ? "Stop" : "Start"}

      </Button>

    </Stack>

  );

}



function CprTimer() {

  const [state, setState] = useState({

    phaseIndex: 0,

    remaining: CPR_PHASES[0].duration,

  });

  const [cycleCount, setCycleCount] = useState(1);

  const [running, setRunning] = useState(false);



  useEffect(() => {

    if (!running) return undefined;



    const intervalId = setInterval(() => {

      setState((prev) => {

        if (prev.remaining > 1) {

          return { ...prev, remaining: prev.remaining - 1 };

        }



        const nextPhaseIndex = (prev.phaseIndex + 1) % CPR_PHASES.length;

        if (nextPhaseIndex === 0) {

          setCycleCount((count) => count + 1);

        }



        return {

          phaseIndex: nextPhaseIndex,

          remaining: CPR_PHASES[nextPhaseIndex].duration,

        };

      });

    }, 1000);



    return () => clearInterval(intervalId);

  }, [running]);



  const currentPhase = CPR_PHASES[state.phaseIndex];

  const phaseDuration = currentPhase.duration;

  const progressValue = ((phaseDuration - state.remaining) / phaseDuration) * 100;



  const handleReset = () => {

    setRunning(false);

    setCycleCount(1);

    setState({ phaseIndex: 0, remaining: CPR_PHASES[0].duration });

  };




}



export default function ActionGuideDrawer({ trigger }) {

  const [open, setOpen] = useState(false);



  return (

    <Drawer.Root placement="right" size="xs" open={open} onOpenChange={setOpen} trapFocus restoreFocus >

      <Drawer.Backdrop

        bg="transparent"

        onClick={() => setOpen(false)}

        style={{ pointerEvents: 'auto', cursor: 'pointer' }}

      />

      <Drawer.Trigger asChild>
        {trigger || (
          <Button
            // colorPalette="blue"
            shadow="lg"
            position="fixed"
            right="4"
            top="50%"
            transform="translateY(-50%)"
            zIndex="modal"
            variant={'subtle'}
          >
            Quick Safety
          </Button>
        )}
      </Drawer.Trigger>

      <Drawer.Content

        bg="bg.surface"

        position="fixed"

        right="0"

        left="auto"

        top="0"

        bottom="0"

        style={{ right: 0, left: 'auto' }}

        onMouseDown={(e) => {

          // Stop propagation for non-interactive elements to prevent backdrop clicks

          // But allow tab clicks and other interactive elements to work

          const target = e.target;

          const isInteractive = target.closest('button') ||

            target.closest('[role="tab"]') ||

            target.closest('[data-part="trigger"]') ||

            target.closest('a') ||

            target.closest('input') ||

            target.closest('select') ||

            target.closest('textarea');

          if (!isInteractive) {

            e.stopPropagation();

          }

        }}

      >

        <style>{`

          [data-part="close-trigger"],

          button[data-close-trigger],

          [aria-label*="close" i],

          [aria-label*="Close" i] {

            display: none !important;

          }

        `}</style>

        {/* <Drawer.Header borderBottomWidth="1px">

                    <Flex justify="space-between" align="center">

                        <Box>

                            <Badge colorPalette="red" mb="2">

                                Life-Saving Steps

                            </Badge>

                            <Heading size="md">Emergency Actions</Heading>

                            <Text color="fg.muted" fontSize="sm">

                                Fast reference for bystanders and responders.

                            </Text>

                        </Box>

                        <Drawer.CloseTrigger asChild>

                            <Button variant="ghost" size="sm">

                                Close

                            </Button>

                        </Drawer.CloseTrigger>

                    </Flex>

                </Drawer.Header> */}



        <Drawer.Body>

          <Tabs.Root variant="enclosed" colorPalette="blue" defaultValue="cpr">

            <Tabs.List >

              <Tabs.Trigger value="cpr" gap="2">

                <LuHeartPulse />

                CPR

              </Tabs.Trigger>

              <Tabs.Trigger value="defib" gap="2">Defibrillator</Tabs.Trigger>

              <Tabs.Trigger value="heimlich" gap="2">Heimlich</Tabs.Trigger>

            </Tabs.List>

            <Tabs.Content value="cpr">

              <Stack spacing="4">

                <Stack spacing="1">

                  <Heading size="sm">High-Quality CPR</Heading>

                  <Text color="fg.muted" fontSize="sm">

                    Use a hard surface, minimize pauses, switch rescuers every 2 minutes if possible.

                  </Text>

                </Stack>

                <StepList steps={quickGuides.cpr} />

                <BpmTimer bpm={103} />

                <CprTimer />

              </Stack>

            </Tabs.Content>

            <Tabs.Content value="defib">

              <Stack spacing="4">

                <Stack spacing="1">

                  <Heading size="sm">Using a Defibrillator (AED)</Heading>

                  <Text color="fg.muted" fontSize="sm">

                    Follow device prompts; resume compressions immediately after any shock.

                  </Text>

                </Stack>

                <StepList steps={quickGuides.defib} />

              </Stack>

            </Tabs.Content>

            <Tabs.Content value="heimlich">

              <Stack spacing="4">

                <Stack spacing="1">

                  <Heading size="sm">Heimlich Maneuver</Heading>

                  <Text color="fg.muted" fontSize="sm">

                    For adults and children over 1 year. For infants, use 5 back blows and 5 chest thrusts instead.

                  </Text>

                </Stack>

                <StepList steps={quickGuides.heimlich} />

              </Stack>

            </Tabs.Content>

          </Tabs.Root>

        </Drawer.Body>



        <Drawer.Footer borderTopWidth="1px" justifyContent="space-between">

          <Text color="fg.muted" fontSize="sm">

            Call 995 immediately; use speakerphone so someone can guide you.

          </Text>

          <Drawer.CloseTrigger asChild>

            <Button variant="outline" size="sm">

              Done

            </Button>

          </Drawer.CloseTrigger>

        </Drawer.Footer>

      </Drawer.Content>

    </Drawer.Root>

  );

}

