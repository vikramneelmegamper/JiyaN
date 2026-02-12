import React from "react";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const GoogleSignInButton = React.forwardRef<
  HTMLButtonElement,
  GoogleSignInButtonProps
>(({ className, onClick, isLoading = false, disabled, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2.5 px-6 py-2.5",
        "rounded-full bg-white border border-gray-300",
        "text-gray-700 font-medium text-sm",
        "transition-all duration-200 ease-out",
        "hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm",
        "active:bg-gray-100",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

GoogleSignInButton.displayName = "GoogleSignInButton";

interface GoogleSignInButtonWithLogoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  text?: string;
}

export const GoogleSignInButtonWithLogo = React.forwardRef<
  HTMLButtonElement,
  GoogleSignInButtonWithLogoProps
>(({ className, onClick, isLoading = false, disabled, text = "Sign in with Google", ...props }, ref) => {
  return (
    <GoogleSignInButton
      ref={ref}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {/* Google "G" Logo */}
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <g transform="matrix(1, 0, 0, 1, 27.009766, -39.238281)">
          <path
            fill="#4285F4"
            d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
          />
          <path
            fill="#34A853"
            d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
          />
          <path
            fill="#FBBC05"
            d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
          />
          <path
            fill="#EA4335"
            d="M -14.754 43.989 C -13.004 43.989 -11.404 44.599 -10.154 45.789 L -6.274 41.909 C -8.804 39.739 -11.514 38.239 -14.754 38.239 C -19.444 38.239 -23.494 40.939 -25.464 44.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
          />
        </g>
      </svg>

      {/* Text */}
      <span className="font-medium text-sm tracking-normal">
        {isLoading ? "Signing in..." : text}
      </span>
    </GoogleSignInButton>
  );
});

GoogleSignInButtonWithLogo.displayName = "GoogleSignInButtonWithLogo";
