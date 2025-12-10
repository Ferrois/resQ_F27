import { Provider } from "./components/ui/provider";
import { Toaster } from "./components/ui/toaster";
import { ApiProvider } from "./Context/ApiContext";
import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./routes";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider>
      <ApiProvider>
        <AppRoutes />
        <Toaster />
      </ApiProvider>
    </Provider>
  </React.StrictMode>
);
