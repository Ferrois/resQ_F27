import { Provider } from "./components/ui/provider";
import { Toaster } from "./components/ui/toaster";
import { ApiProvider } from "./Context/ApiContext";
import { LocationProvider } from "./Context/LocationContext";
import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./routes";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider>
      <ApiProvider>
        <LocationProvider>
          <AppRoutes />
          <Toaster />
        </LocationProvider>
      </ApiProvider>
    </Provider>
  </React.StrictMode>
);
