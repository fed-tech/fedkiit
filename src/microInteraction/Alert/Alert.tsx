"use client";

import { Toaster, toast } from "react-hot-toast";

/**
 * Toast helper — ported from FED-Frontend/src/microInteraction/Alert/Alert.jsx.
 *
 * `showAlert()` fires a toast. `<AlertToaster />` must be mounted once (root
 * layout) so notifications render on every route — AttendancePage previously
 * called `Alert()` without mounting a Toaster, so scans looked silent.
 */

export type AlertProps = {
  type?: string;
  message?: string;
  position?: string;
  duration?: number;
  style?: React.CSSProperties;
  /** Stable id — replaces an existing toast instead of stacking duplicates. */
  id?: string;
};

function toastStyle(
  type: string | undefined,
  style?: React.CSSProperties,
): React.CSSProperties {
  const defaultStyle: React.CSSProperties = {
    borderRadius: "8px",
    padding: "12px 14px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
    fontSize: "15px",
    maxWidth: "min(420px, calc(100vw - 2rem))",
  };

  const mobileStyle: React.CSSProperties =
    typeof window !== "undefined" && window.innerWidth <= 768
      ? { marginBottom: "2rem" }
      : {};

  const base = { ...defaultStyle, ...style, ...mobileStyle };

  switch (type) {
    case "success":
      return {
        ...base,
        border: "1.5px solid #198754",
        backgroundColor: "#d3f9d3",
        color: "#198754",
      };
    case "error":
      return {
        ...base,
        border: "1.5px solid #dc3545",
        backgroundColor: "#FADADD",
        color: "#b02a37",
      };
    case "info":
    case "warning":
      return {
        ...base,
        border: "1.5px solid #fd7e14",
        backgroundColor: "#fff3cd",
        color: "#856404",
      };
    case "infoOmega":
      return {
        ...base,
        border: "1.5px solid #0171e3d6",
        backgroundColor: "white",
        color: "#0171e3d6",
      };
    default:
      return base;
  }
}

export function showAlert({
  type,
  message,
  position = "top-right",
  duration = 5000,
  style,
  id,
}: AlertProps) {
  if (!message) return;

  const options = {
    id: id ?? message.slice(0, 80),
    duration,
    position: position as never,
    style: toastStyle(type, style),
  };

  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    default:
      toast(message, options);
      break;
  }
}

/** Mount once in the root layout. */
export function AlertToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 72, zIndex: 99999 }}
      toastOptions={{
        className: "",
        success: { duration: 4000 },
        error: { duration: 5500 },
      }}
    />
  );
}

/**
 * Backward compatible: callable as `Alert({ type, message })` or rendered as
 * `<Alert />` on pages that still mount their own copy (harmless duplicate
 * until removed — global AlertToaster in layout is authoritative).
 */
const Alert = (props: AlertProps) => {
  if (props.message) {
    showAlert(props);
  }
  return <AlertToaster />;
};

export default Alert;
