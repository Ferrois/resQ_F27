import { Box, Image } from "@chakra-ui/react";
import resqLogo from "../../assets/resq.svg";

export default function Logo({ boxSize = 10, ...props }) {
  return (
    <Box boxSize={boxSize} {...props}>
      <Image
        src={resqLogo}
        alt="ResQ Logo"
        boxSize="100%"
        objectFit="contain"
        draggable={false}
      />
    </Box>
  );
}
