import { useAuth } from "@/hooks/useAuth";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

export default function IdleTimeoutWrapper() {
  const { user } = useAuth();
  useIdleTimeout(!!user);
  return null;
}
