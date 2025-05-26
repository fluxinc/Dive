import { createHashRouter, Navigate } from "react-router-dom"
import Layout from "./views/Layout"
import Chat from "./views/Chat"
import Welcome from "./views/Welcome"
import Setup from "./views/Setup"
import DocumentUpload from "./views/DocumentUpload"

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Welcome />
      },
      {
        path: "chat",
        element: <Chat />
      },
      {
        path: "chat/:chatId",
        element: <Chat />
      },
      {
        path: "setup",
        element: <Setup />
      },
      {
        path: "upload",
        element: <DocumentUpload />
      },
      // Navigate to the root page if the route is not found - stops 404 errors
      {
        path: "*",
        element: <Navigate to="/" replace />
      }
    ]
  }
])
