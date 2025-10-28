import "@/styles/tokens.css";
import "@/styles/globals.css";
import "@/styles/groups-modern.css";
import "@/styles/modern-buttons.css";
import "@/styles/forms.css";
import "@/styles/layout.css";
import "@/styles/cards.css";
import "@/styles/animations.css";
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { useSession } from '../hooks/useSession';

function AppContent({ Component, pageProps }) {
  const { user } = useSession();
  
  return (
    <WebSocketProvider userID={user?.userID}>
      <Component {...pageProps} />
    </WebSocketProvider>
  );
}

export default function App(props) {
  return <AppContent {...props} />;
}
