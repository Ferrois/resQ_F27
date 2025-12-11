import { Provider } from "./components/ui/provider";
import { Toaster } from "./components/ui/toaster";
import { ApiProvider } from "./Context/ApiContext";
import { LocationProvider } from "./Context/LocationContext";
import { SocketProvider } from "./Context/SocketContext";
import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./routes";
import { DarkMode } from "./components/ui/color-mode";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider>
      <ApiProvider>
        <DarkMode>
          <LocationProvider>
            <SocketProvider>
              <AppRoutes />
              <Toaster />
            </SocketProvider>
          </LocationProvider>
        </DarkMode>
      </ApiProvider>
    </Provider>
  </React.StrictMode>
);
